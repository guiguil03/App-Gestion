import { Injectable } from '@nestjs/common';

import { PrismaService } from '@/database/prisma.service';
import { AttendanceService } from '@/modules/attendance/attendance.service';
import type { AuthenticatedUser } from '@/modules/auth/types';
import type { PushChangesBody } from '@/modules/sync/dto/push-changes.dto';

type WatermelonChanges<T> = { created: T[]; updated: T[]; deleted: string[] };

export type PullResult = {
  changes: Record<string, WatermelonChanges<Record<string, unknown>>>;
  timestamp: number;
};

// Simplification assumée par WatermelonDB : que la ligne soit rangée dans
// `created` ou `updated` ne change rien côté client (les deux déclenchent un
// upsert), donc tout part dans `updated`. `deleted` n'est pas géré en v1 : les
// tables de référence synchronisées ici ne sont pas supprimables.
function bucket<T>(rows: T[]): WatermelonChanges<T> {
  return { created: [], updated: rows, deleted: [] };
}

@Injectable()
export class SyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly attendance: AttendanceService,
  ) {}

  async pull(schoolId: string, userId: string, lastPulledAt: number): Promise<PullResult> {
    const since = new Date(lastPulledAt);
    const timestamp = Date.now();

    const [school, classes, students, revokedCards, currentUser, attendanceRecords] = await Promise.all([
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
    ]);

    return {
      timestamp,
      changes: {
        schools: bucket(school && school.updatedAt > since ? [toSchoolRow(school)] : []),
        school_classes: bucket(classes.map(toSchoolClassRow)),
        students: bucket(students.map(toStudentRow)),
        revoked_cards: bucket(revokedCards.map((c) => ({ id: c.id, card_id: c.id }))),
        assigned_classes: bucket((currentUser?.assignedClasses ?? []).map(toAssignedClassRow)),
        attendance_records: bucket(attendanceRecords.map(toAttendanceRecordRow)),
      },
    };
  }

  async push(user: AuthenticatedUser, changes: PushChangesBody['changes']): Promise<void> {
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
}) {
  return {
    id: record.id,
    student_id: record.studentId,
    checkpoint: record.checkpoint.toLowerCase(),
    direction: record.direction.toLowerCase(),
    recorded_at: record.recordedAt.getTime(),
    is_late: record.isLate,
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
