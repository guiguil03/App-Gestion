import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationChannel } from '@prisma/client';

import { FieldEncryptionService } from '@/common/crypto/field-encryption';
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
    private readonly crypto: FieldEncryptionService,
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
   * SMS et push respectent tous deux le canal choisi par fiche parent
   * (`ParentGuardian.notificationChannel`) : `ParentGuardian.userId` relie
   * chaque fiche au compte PARENT provisionné pour elle (voir
   * `StudentsService.provisionParentAccount`), donc le push peut être filtré
   * fiche par fiche exactement comme le SMS, y compris en cas de fratrie où
   * plusieurs fiches pointent vers le même compte.
   */
  private async notifyParents(studentId: string, message: string, pushTitle: string): Promise<void> {
    const parentGuardians = await this.prisma.parentGuardian.findMany({
      where: { studentId },
      include: { user: true },
    });

    const smsRecipients = parentGuardians.filter(
      (parent) =>
        parent.notificationChannel === NotificationChannel.SMS || parent.notificationChannel === NotificationChannel.BOTH,
    );
    const pushRecipients = parentGuardians.filter(
      (parent) =>
        (parent.notificationChannel === NotificationChannel.PUSH || parent.notificationChannel === NotificationChannel.BOTH) &&
        !!parent.user?.expoPushToken,
    );

    await Promise.all([
      ...smsRecipients.map((parent) =>
        this.sms.send(this.crypto.decrypt(parent.phoneNumber), message).catch((error: unknown) => {
          this.logger.warn(`Échec d'envoi SMS pour le parent ${parent.id}`, error);
        }),
      ),
      ...pushRecipients.map((parent) =>
        this.push.send(parent.user!.expoPushToken!, pushTitle, message).catch((error: unknown) => {
          this.logger.warn(`Échec d'envoi push pour le compte ${parent.user!.id}`, error);
        }),
      ),
    ]);
  }
}
