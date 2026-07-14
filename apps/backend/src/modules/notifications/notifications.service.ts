import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationChannel } from '@prisma/client';

import { PrismaService } from '@/database/prisma.service';
import { ABSENCE_MARKED_EVENT, AbsenceMarkedEvent } from '@/modules/absences/events/absence-marked.event';
import { ATTENDANCE_RECORDED_EVENT, AttendanceRecordedEvent } from '@/modules/attendance/events/attendance-recorded.event';
import { PushProvider } from '@/modules/notifications/providers/push-provider';
import { SmsProvider } from '@/modules/notifications/providers/sms-provider';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sms: SmsProvider,
    private readonly push: PushProvider,
  ) {}

  /**
   * `EventEmitter2.emit()` (utilisé par AttendanceService) ne bloque pas sur
   * les listeners async : ce handler tourne après coup, sans ralentir la
   * confirmation du pointage (exigence <2s du cahier des charges).
   */
  @OnEvent(ATTENDANCE_RECORDED_EVENT)
  async handleAttendanceRecorded(event: AttendanceRecordedEvent): Promise<void> {
    const student = await this.findStudentWithSchool(event.studentId);
    if (!student) return;

    const time = event.recordedAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const lateSuffix = event.isLate ? ' (en retard)' : '';
    const message = `Bonjour, votre enfant ${this.fullName(student)} est bien arrivé à l'école ${student.school.name} à ${time}${lateSuffix}.`;

    await this.notifyParents(student.id, message, 'Arrivée');
  }

  /**
   * Déclenché par `AbsencesService.detectAbsences` — voir §3.5 du cahier des
   * charges (notification d'absence sans délai au parent/tuteur).
   */
  @OnEvent(ABSENCE_MARKED_EVENT)
  async handleAbsenceMarked(event: AbsenceMarkedEvent): Promise<void> {
    const student = await this.findStudentWithSchool(event.studentId);
    if (!student) return;

    const message = `Bonjour, votre enfant ${this.fullName(student)} est absent aujourd'hui à l'école ${student.school.name}. Contactez l'école si besoin.`;

    await this.notifyParents(student.id, message, 'Absence');
  }

  private async findStudentWithSchool(studentId: string) {
    return this.prisma.student.findUnique({ where: { id: studentId }, include: { school: true } });
  }

  private fullName(student: { lastName: string; middleName: string | null; firstName: string }): string {
    return [student.lastName, student.middleName, student.firstName].filter(Boolean).join(' ');
  }

  /**
   * SMS : respecte le canal choisi par fiche parent (`ParentGuardian.notificationChannel`).
   * Push : envoyé à tout compte PARENT lié à l'élève disposant d'un
   * `expoPushToken` — le modèle de données ne relie pas un compte PARENT à
   * une fiche `ParentGuardian` précise (le lien se fait par numéro de
   * téléphone au provisioning, cf. `students.service.ts`), donc le canal
   * "push" ne peut pas encore être filtré fiche par fiche comme le SMS ;
   * c'est une simplification connue, pas un oubli.
   */
  private async notifyParents(studentId: string, message: string, pushTitle: string): Promise<void> {
    const [parentGuardians, parentUsers] = await Promise.all([
      this.prisma.parentGuardian.findMany({ where: { studentId } }),
      this.prisma.user.findMany({ where: { role: 'PARENT', children: { some: { id: studentId } } } }),
    ]);

    const smsRecipients = parentGuardians.filter(
      (parent) =>
        parent.notificationChannel === NotificationChannel.SMS || parent.notificationChannel === NotificationChannel.BOTH,
    );
    const pushRecipients = parentUsers.filter((user): user is typeof user & { expoPushToken: string } => !!user.expoPushToken);

    await Promise.all([
      ...smsRecipients.map((parent) =>
        this.sms.send(parent.phoneNumber, message).catch((error: unknown) => {
          this.logger.warn(`Échec d'envoi SMS pour le parent ${parent.id}`, error);
        }),
      ),
      ...pushRecipients.map((user) =>
        this.push.send(user.expoPushToken, pushTitle, message).catch((error: unknown) => {
          this.logger.warn(`Échec d'envoi push pour le compte ${user.id}`, error);
        }),
      ),
    ]);
  }
}
