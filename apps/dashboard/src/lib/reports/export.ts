import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import type { StudentAttendanceSummary } from '@/types/reports';

const COLUMNS = ['Élève', 'Classe', 'Présences', 'Retards', 'Absences justifiées', 'Absences non justifiées'] as const;

function fullName(student: StudentAttendanceSummary['student']): string {
  return [student.lastName, student.middleName, student.firstName].filter(Boolean).join(' ');
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
