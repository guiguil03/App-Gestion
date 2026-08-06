import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import type { AttendanceHistoryEntry, StudentAttendanceSummary } from '@/types/reports';
import type { PresenceRecord } from '@/types/attendance';

const COLUMNS = ['Élève', 'Classe', 'Présences', 'Retards', 'Absences justifiées', 'Absences non justifiées'] as const;
const HISTORY_COLUMNS = ['Date', 'Élève', 'Classe', 'Statut', 'Heure', 'Motif'] as const;

const HISTORY_STATUS_LABEL: Record<AttendanceHistoryEntry['status'], string> = {
  PRESENT: 'Présent',
  LATE: 'En retard',
  ABSENT: 'Absent',
};

function fullName(student: StudentAttendanceSummary['student']): string {
  return [student.lastName, student.middleName, student.firstName].filter(Boolean).join(' ');
}

function toHistoryRows(entries: AttendanceHistoryEntry[]): (string | number)[][] {
  return entries.map((e) => [
    e.date,
    fullName(e.student),
    `${e.student.schoolClass.name} — ${e.student.schoolClass.promotion}`,
    HISTORY_STATUS_LABEL[e.status],
    e.recordedAt ? new Date(e.recordedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '—',
    e.status === 'ABSENT' ? (e.justified ? `Justifiée${e.justificationReason ? ` — ${e.justificationReason}` : ''}` : 'Non justifiée') : '—',
  ]);
}

function toRows(summaries: StudentAttendanceSummary[]): (string | number)[][] {
  return summaries.map((s) => [
    fullName(s.student),
    `${s.student.schoolClass.name} — ${s.student.schoolClass.promotion}`,
    s.presencesCount,
    s.lateCount,
    s.absencesJustifiedCount,
    s.absencesUnjustifiedCount,
  ]);
}

export function exportAttendanceSummaryPdf(
  summaries: StudentAttendanceSummary[],
  title: string,
  filename: string,
): void {
  const doc = new jsPDF({ orientation: 'landscape' });
  doc.setFontSize(14);
  doc.text(title, 14, 16);
  autoTable(doc, {
    head: [[...COLUMNS]],
    body: toRows(summaries),
    startY: 22,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [15, 122, 92] },
  });
  doc.save(filename);
}

export function exportAttendanceSummaryExcel(summaries: StudentAttendanceSummary[], filename: string): void {
  const worksheet = XLSX.utils.aoa_to_sheet([[...COLUMNS], ...toRows(summaries)]);
  worksheet['!cols'] = [{ wch: 28 }, { wch: 20 }, { wch: 12 }, { wch: 10 }, { wch: 18 }, { wch: 20 }];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Rapport');
  XLSX.writeFile(workbook, filename);
}

export function exportAttendanceHistoryPdf(entries: AttendanceHistoryEntry[], title: string, filename: string): void {
  const doc = new jsPDF({ orientation: 'landscape' });
  doc.setFontSize(14);
  doc.text(title, 14, 16);
  autoTable(doc, {
    head: [[...HISTORY_COLUMNS]],
    body: toHistoryRows(entries),
    startY: 22,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [15, 122, 92] },
  });
  doc.save(filename);
}

export function exportAttendanceHistoryExcel(entries: AttendanceHistoryEntry[], filename: string): void {
  const worksheet = XLSX.utils.aoa_to_sheet([[...HISTORY_COLUMNS], ...toHistoryRows(entries)]);
  worksheet['!cols'] = [{ wch: 12 }, { wch: 28 }, { wch: 20 }, { wch: 12 }, { wch: 10 }, { wch: 24 }];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Historique');
  XLSX.writeFile(workbook, filename);
}

const PRESENCE_COLUMNS = ['Élève', 'Classe', 'Checkpoint', 'Heure', 'Statut', 'Origine'] as const;

function toPresenceRows(rows: PresenceRecord[]): (string | number)[][] {
  return rows.map((record) => [
    [record.student.lastName, record.student.middleName, record.student.firstName].filter(Boolean).join(' '),
    `${record.student.schoolClass.name} — ${record.student.schoolClass.promotion}`,
    record.checkpoint === 'PORTAIL' ? 'Portail' : 'Salle de classe',
    new Date(record.recordedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    record.isLate ? 'En retard' : 'À l’heure',
    record.isManual ? 'Manuel' : 'Scan',
  ]);
}

/** Liste des pointages bruts d'un jour (page Présences) — contrairement à
 * `exportAttendanceHistoryPdf/Excel` (un statut agrégé par élève/jour via
 * `/reports/history`), une ligne par pointage brut, avec checkpoint/origine. */
export function exportPresenceListPdf(rows: PresenceRecord[], title: string, filename: string): void {
  const doc = new jsPDF({ orientation: 'landscape' });
  doc.setFontSize(14);
  doc.text(title, 14, 16);
  autoTable(doc, {
    head: [[...PRESENCE_COLUMNS]],
    body: toPresenceRows(rows),
    startY: 22,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [15, 122, 92] },
  });
  doc.save(filename);
}

export function exportPresenceListExcel(rows: PresenceRecord[], filename: string): void {
  const worksheet = XLSX.utils.aoa_to_sheet([[...PRESENCE_COLUMNS], ...toPresenceRows(rows)]);
  worksheet['!cols'] = [{ wch: 28 }, { wch: 20 }, { wch: 14 }, { wch: 10 }, { wch: 12 }, { wch: 10 }];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Présences');
  XLSX.writeFile(workbook, filename);
}

export type StudentDossierInfo = {
  lastName: string;
  middleName: string | null;
  firstName: string;
  sex: 'M' | 'F';
  dateOfBirth: string;
  schoolClass: { name: string; promotion: string };
  parents: { fullName: string; relationship: string; phoneNumber: string }[];
};

const DOSSIER_COLUMNS = ['Date', 'Statut', 'Heure', 'Motif'] as const;

function dossierRows(entries: AttendanceHistoryEntry[]): (string | number)[][] {
  return entries.map((e) => [
    e.date,
    HISTORY_STATUS_LABEL[e.status],
    e.recordedAt ? new Date(e.recordedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '—',
    e.status === 'ABSENT' ? (e.justified ? `Justifiée${e.justificationReason ? ` — ${e.justificationReason}` : ''}` : 'Non justifiée') : '—',
  ]);
}

function dossierHeader(student: StudentDossierInfo): [name: string, infoLine: string, parentsLine: string] {
  const name = [student.lastName, student.middleName, student.firstName].filter(Boolean).join(' ');
  const parentsLine = student.parents.length
    ? student.parents.map((p) => `${p.fullName} (${p.relationship}) — ${p.phoneNumber}`).join(' · ')
    : 'Aucun parent renseigné';
  const infoLine = `${student.schoolClass.name} — ${student.schoolClass.promotion} · ${student.sex === 'M' ? 'Masculin' : 'Féminin'} · Né(e) le ${student.dateOfBirth}`;
  return [name, infoLine, `Parent(s) : ${parentsLine}`];
}

/** Dossier complet d'un élève (fiche + historique de présence) — pour un
 * transfert d'école ou une demande administrative. Réutilise le même
 * historique que le rapport global, filtré sur un seul élève. */
export function exportStudentDossierPdf(student: StudentDossierInfo, entries: AttendanceHistoryEntry[], filename: string): void {
  const doc = new jsPDF({ orientation: 'landscape' });
  const [name, infoLine, parentsLine] = dossierHeader(student);
  doc.setFontSize(15);
  doc.text(`Dossier élève — ${name}`, 14, 16);
  doc.setFontSize(9);
  doc.setTextColor(90);
  doc.text(infoLine, 14, 23);
  doc.text(parentsLine, 14, 28);
  doc.setTextColor(0);
  autoTable(doc, {
    head: [[...DOSSIER_COLUMNS]],
    body: dossierRows(entries),
    startY: 34,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [15, 122, 92] },
  });
  doc.save(filename);
}

export function exportStudentDossierExcel(student: StudentDossierInfo, entries: AttendanceHistoryEntry[], filename: string): void {
  const [name, infoLine, parentsLine] = dossierHeader(student);
  const worksheet = XLSX.utils.aoa_to_sheet([
    [`Dossier élève — ${name}`],
    [infoLine],
    [parentsLine],
    [],
    [...DOSSIER_COLUMNS],
    ...dossierRows(entries),
  ]);
  worksheet['!cols'] = [{ wch: 12 }, { wch: 14 }, { wch: 10 }, { wch: 30 }];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Dossier');
  XLSX.writeFile(workbook, filename);
}
