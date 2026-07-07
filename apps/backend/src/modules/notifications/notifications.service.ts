import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationChannel } from '@prisma/client';

import { PrismaService } from '@/database/prisma.service';
import { ATTENDANCE_RECORDED_EVENT, AttendanceRecordedEvent } from '@/modules/attendance/events/attendance-recorded.event';
import { SmsProvider } from '@/modules/notifications/providers/sms-provider';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sms: SmsProvider,
  ) {}

  /**
   * `EventEmitter2.emit()` (utilisé par AttendanceService) ne bloque pas sur
   * les listeners async : ce handler tourne après coup, sans ralentir la
   * confirmation du pointage (exigence <2s du cahier des charges).
   */
  @OnEvent(ATTENDANCE_RECORDED_EVENT)
  async handleAttendanceRecorded(event: AttendanceRecordedEvent): Promise<void> {
    const [student, parents] = await Promise.all([
      this.prisma.student.findUnique({ where: { id: event.studentId }, include: { school: true } }),
      this.prisma.parentGuardian.findMany({ where: { studentId: event.studentId } }),
    ]);
    if (!student) return;

    const recipients = parents.filter(
      (parent) =>
        parent.notificationChannel === NotificationChannel.SMS ||
        parent.notificationChannel === NotificationChannel.BOTH,
    );
    if (recipients.length === 0) return;

    const fullName = [student.lastName, student.middleName, student.firstName].filter(Boolean).join(' ');
    const time = event.recordedAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const lateSuffix = event.isLate ? ' (en retard)' : '';
    const message = `Bonjour, votre enfant ${fullName} est bien arrivé à l'école ${student.school.name} à ${time}${lateSuffix}.`;

    await Promise.all(
      recipients.map((parent) =>
        this.sms.send(parent.phoneNumber, message).catch((error: unknown) => {
          this.logger.warn(`Échec d'envoi SMS pour le parent ${parent.id}`, error);
        }),
      ),
    );
  }
}
