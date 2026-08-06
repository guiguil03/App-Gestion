import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { PrismaService } from '@/database/prisma.service';
import { EmailProvider } from '@/modules/notifications/providers/email-provider';
import { ReportsService } from '@/modules/reports/reports.service';

const REPORT_WINDOW_DAYS = 7;

function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildEmailHtml(schoolName: string, startDate: string, endDate: string, rows: Awaited<ReturnType<ReportsService['attendanceSummary']>>): string {
  const tableRows = rows
    .map(
      (row) => `<tr>
        <td>${row.student.lastName} ${row.student.firstName}</td>
        <td>${row.student.schoolClass.name}</td>
        <td style="text-align:center">${row.presencesCount}</td>
        <td style="text-align:center">${row.lateCount}</td>
        <td style="text-align:center">${row.absencesJustifiedCount}</td>
        <td style="text-align:center">${row.absencesUnjustifiedCount}</td>
      </tr>`,
    )
    .join('');

  return `<div style="font-family:sans-serif">
    <h2>Rapport hebdomadaire de présence — ${schoolName}</h2>
    <p>Du ${startDate} au ${endDate}</p>
    <table style="border-collapse:collapse;width:100%" border="1" cellpadding="6">
      <thead>
        <tr><th>Élève</th><th>Classe</th><th>Présences</th><th>Retards</th><th>Abs. justifiées</th><th>Abs. non justifiées</th></tr>
      </thead>
      <tbody>${tableRows}</tbody>
    </table>
    <p style="color:#71717a;font-size:12px">Rapport généré automatiquement — le détail est aussi disponible dans le dashboard, page Rapports.</p>
  </div>`;
}

/**
 * Envoie chaque lundi un résumé de présence de la semaine écoulée aux
 * comptes DIRECTION ayant renseigné un email (dashboard → Profil) — évite
 * d'avoir à se connecter pour suivre l'essentiel. Best-effort par
 * destinataire : un échec d'envoi pour un compte ne doit jamais empêcher les
 * autres écoles/comptes de recevoir le leur.
 */
@Injectable()
export class WeeklyReportJob {
  private readonly logger = new Logger(WeeklyReportJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly reports: ReportsService,
    private readonly email: EmailProvider,
  ) {}

  @Cron('0 7 * * 1') // chaque lundi à 7h
  async handleCron(): Promise<void> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - REPORT_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const startKey = dateKey(startDate);
    const endKey = dateKey(endDate);

    const schools = await this.prisma.school.findMany({ where: { deletedAt: null }, select: { id: true, name: true } });

    for (const school of schools) {
      const recipients = await this.prisma.user.findMany({
        where: { schoolId: school.id, role: 'DIRECTION', disabledAt: null, email: { not: null } },
        select: { email: true },
      });
      if (recipients.length === 0) continue;

      const rows = await this.reports.attendanceSummary(school.id, undefined, startKey, endKey);
      const html = buildEmailHtml(school.name, startKey, endKey, rows);
      const subject = `Rapport hebdomadaire de présence — ${school.name}`;

      for (const recipient of recipients) {
        try {
          await this.email.send(recipient.email!, subject, html);
        } catch (error) {
          this.logger.warn(`Échec d'envoi du rapport hebdomadaire à ${recipient.email}`, error);
        }
      }
    }
  }
}
