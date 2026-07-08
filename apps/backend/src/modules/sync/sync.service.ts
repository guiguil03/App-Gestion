import { Injectable } from '@nestjs/common';

import { PrismaService } from '@/database/prisma.service';
import { AttendanceSessionsService } from '@/modules/attendance/attendance-sessions.service';
import { AttendanceService } from '@/modules/attendance/attendance.service';
import type { AuthenticatedUser } from '@/modules/auth/types';
import type { PushChangesBody } from '@/modules/sync/dto/push-changes.dto';

type WatermelonChanges<T> = { created: T[]; updated: T[]; deleted: string[] };

export type PullResult = {
  changes: Record<string, WatermelonChanges<Record<string, unknown>>>;
  timestamp: number;
};

// WatermelonDB attend que `created` contienne des lignes que l'appareil n'a
// jamais vues, et `updated` des lignes qu'il a déjà et qui ont changé — s'y
// tromper fait logger une "[Sync] ... This could be a serious bug" bruyante
// à chaque pull (le fallback auto-corrige, mais pollue les logs). On classe
// donc chaque ligne via `createdAt` vs `since` : créée après le dernier pull
// de cet appareil ⇒ forcément nouvelle pour lui ⇒ `created` ; créée avant
// mais renvoyée maintenant ⇒ c'est forcément parce qu'elle a été modifiée
// depuis ⇒ `updated`.
function splitBucket<T extends { createdAt: Date }, R>(
  rows: T[],
  since: Date,
  toRow: (row: T) => R,
): WatermelonChanges<R> {
  const created: R[] = [];
  const updated: R[] = [];
  for (const row of rows) {
    (row.createdAt.getTime() > since.getTime() ? created : updated).push(toRow(row));
  }
  return { created, updated, deleted: [] };
}

// Pour les tables où chaque ligne renvoyée n'est structurellement envoyée
// qu'une seule fois à un appareil donné (filtrées par un timestamp qui ne
// rebouge jamais après coup, ex. `receivedAt` d'un pointage) : toujours
// nouvelle pour l'appareil qui la reçoit, donc toujours `created`.
function createdOnlyBucket<T>(rows: T[]): WatermelonChanges<T> {
  return { created: rows, updated: [], deleted: [] };
}

// Pour les tables toujours renvoyées en intégralité (non filtrées par
// `since`, cf. commentaires plus bas) : tout est nouveau au tout premier
// pull (`since` epoch 0), et déjà connu de l'appareil à chaque pull suivant.
function firstSyncBucket<T>(rows: T[], since: Date): WatermelonChanges<T> {
  return since.getTime() === 0 ? { created: rows, updated: [], deleted: [] } : { created: [], updated: rows, deleted: [] };
}

@Injectable()
export class SyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly attendance: AttendanceService,
    private readonly attendanceSessions: AttendanceSessionsService,
  ) {}

  async pull(schoolId: string, userId: string, lastPulledAt: number): Promise<PullResult> {
    const since = new Date(lastPulledAt);
    const timestamp = Date.now();

    const [school, classes, students, revokedCards, currentUser, attendanceRecords, signingKeys, parentGuardians] =
      await Promise.all([
        this.prisma.school.findUnique({ where: { id: schoolId } }),
        this.prisma.schoolClass.findMany({ where: { schoolId, updatedAt: { gt: since } } }),
        this.prisma.student.findMany({ where: { schoolId, updatedAt: { gt: since } } }),
        this.prisma.studentCard.findMany({
          where: { revoked: true, student: { schoolId }, updatedAt: { gt: since } },
          select: { id: true },
        }),
        // Pas de filtrage par `since` : l'ensemble des classes assignées est petit,
        // on renvoie toujours la liste complète plutôt qu'un delta.
        this.prisma.user.findUnique({
          where: { id: userId },
          include: { assignedClasses: { where: { schoolId } } },
        }),
        // Filtré par `receivedAt` (horodatage serveur) et non `recordedAt` (horodatage
        // métier) : un pointage vieux de 3 jours mais reçu il y a une minute doit
        // quand même remonter dans ce delta.
        this.prisma.attendanceRecord.findMany({
          where: { student: { schoolId }, receivedAt: { gt: since } },
        }),
        // Pas de filtrage par `since` non plus : le répertoire des clés
        // enseignant de l'école est petit et nécessaire en entier pour
        // vérifier hors-ligne la signature de n'importe quel enseignant.
        this.prisma.teacherSigningKey.findMany({ where: { user: { schoolId } } }),
        this.prisma.parentGuardian.findMany({ where: { student: { schoolId }, updatedAt: { gt: since } } }),
      ]);

    return {
      timestamp,
      changes: {
        schools: splitBucket(school && school.updatedAt > since ? [school] : [], since, toSchoolRow),
        school_classes: splitBucket(classes, since, toSchoolClassRow),
        students: splitBucket(students, since, toStudentRow),
        revoked_cards: createdOnlyBucket(revokedCards.map((c) => ({ id: c.id, card_id: c.id }))),
        assigned_classes: firstSyncBucket((currentUser?.assignedClasses ?? []).map(toAssignedClassRow), since),
        attendance_records: createdOnlyBucket(attendanceRecords.map(toAttendanceRecordRow)),
        teacher_signing_keys: splitBucket(signingKeys, since, toTeacherSigningKeyRow),
        parent_guardians: splitBucket(parentGuardians, since, toParentGuardianRow),
      },
    };
  }

  async push(user: AuthenticatedUser, changes: PushChangesBody['changes']): Promise<void> {
    // Les sessions doivent être créées avant les pointages qui les
    // référencent : un même cycle de push peut pousser les deux dans le même
    // aller, l'ordre importe donc (cas d'un appareil élève qui aurait aussi
    // une session à pousser n'existe pas en v1, mais reste défensif).
    const createdSessions = changes.attendance_sessions?.created ?? [];
    for (const raw of createdSessions) {
      await this.attendanceSessions.createFromSync(user, raw);
    }

    const updatedSessions = changes.attendance_sessions?.updated ?? [];
    for (const raw of updatedSessions) {
      await this.attendanceSessions.closeFromSync(user, raw);
    }

    const created = changes.attendance_records?.created ?? [];
    for (const raw of created) {
      await this.attendance.recordFromSync(user, raw);
    }
  }
}

function toSchoolRow(school: {
  id: string;
  name: string;
  attendanceReferenceTime: string;
  attendanceToleranceMinutes: number;
  cardSigningPublicKey: string;
}) {
  return {
    id: school.id,
    name: school.name,
    attendance_reference_time: school.attendanceReferenceTime,
    attendance_tolerance_minutes: school.attendanceToleranceMinutes,
    // Clé publique Ed25519 (hex) — la privée ne quitte jamais le backend.
    // Permet la vérification de signature de carte 100% offline côté mobile.
    card_signing_public_key: school.cardSigningPublicKey,
  };
}

function toSchoolClassRow(schoolClass: { id: string; schoolId: string; name: string; promotion: string }) {
  return {
    id: schoolClass.id,
    school_id: schoolClass.schoolId,
    name: schoolClass.name,
    promotion: schoolClass.promotion,
  };
}

function toAssignedClassRow(schoolClass: { id: string }) {
  return {
    id: schoolClass.id,
    school_class_id: schoolClass.id,
  };
}

function toAttendanceRecordRow(record: {
  id: string;
  studentId: string;
  checkpoint: string;
  direction: string;
  recordedAt: Date;
  isLate: boolean;
  sessionId: string | null;
}) {
  return {
    id: record.id,
    student_id: record.studentId,
    checkpoint: record.checkpoint.toLowerCase(),
    direction: record.direction.toLowerCase(),
    recorded_at: record.recordedAt.getTime(),
    is_late: record.isLate,
    session_id: record.sessionId,
  };
}

function toTeacherSigningKeyRow(key: { userId: string; publicKey: string }) {
  return {
    id: key.userId,
    user_id: key.userId,
    public_key: key.publicKey,
  };
}

function toParentGuardianRow(parent: {
  id: string;
  studentId: string;
  fullName: string;
  relationship: string;
  phoneNumber: string;
  secondaryPhoneNumber: string | null;
  address: string | null;
  notificationChannel: string;
}) {
  return {
    id: parent.id,
    student_id: parent.studentId,
    full_name: parent.fullName,
    relationship: parent.relationship,
    phone_number: parent.phoneNumber,
    secondary_phone_number: parent.secondaryPhoneNumber,
    address: parent.address,
    notification_channel: parent.notificationChannel.toLowerCase(),
  };
}

function toStudentRow(student: {
  id: string;
  schoolId: string;
  schoolClassId: string;
  lastName: string;
  middleName: string | null;
  firstName: string;
  sex: string;
  dateOfBirth: string;
  photoUrl: string | null;
}) {
  return {
    id: student.id,
    school_id: student.schoolId,
    school_class_id: student.schoolClassId,
    last_name: student.lastName,
    middle_name: student.middleName,
    first_name: student.firstName,
    sex: student.sex,
    date_of_birth: student.dateOfBirth,
    photo_url: student.photoUrl,
  };
}
