'use client';

import { useMemo, useState } from 'react';
import { useClasses } from '@/lib/hooks/useClasses';
import { useAttendanceSummary } from '@/lib/hooks/useReports';
import { exportAttendanceSummaryExcel, exportAttendanceSummaryPdf } from '@/lib/reports/export';
import type { StudentAttendanceSummary } from '@/types/reports';

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function defaultRange(): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 29);
  return { start: isoDate(start), end: isoDate(end) };
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'Tous les statuts' },
  { value: 'unjustified', label: 'Avec absence(s) non justifiée(s)' },
  { value: 'justified', label: 'Avec absence(s) justifiée(s)' },
  { value: 'late', label: 'Avec retard(s)' },
  { value: 'perfect', label: 'Présent sans absence ni retard' },
] as const;

type StatusFilter = (typeof STATUS_OPTIONS)[number]['value'];

function fullName(student: StudentAttendanceSummary['student']): string {
  return [student.lastName, student.middleName, student.firstName].filter(Boolean).join(' ');
}

function matchesStatus(row: StudentAttendanceSummary, status: StatusFilter): boolean {
  switch (status) {
    case 'unjustified':
      return row.absencesUnjustifiedCount > 0;
    case 'justified':
      return row.absencesJustifiedCount > 0;
    case 'late':
      return row.lateCount > 0;
    case 'perfect':
      return row.absencesUnjustifiedCount === 0 && row.absencesJustifiedCount === 0 && row.lateCount === 0;
    default:
      return true;
  }
}

export default function RapportsPage() {
  const classes = useClasses();
  const initialRange = useMemo(defaultRange, []);
  const [schoolClassId, setSchoolClassId] = useState('');
  const [startDate, setStartDate] = useState(initialRange.start);
  const [endDate, setEndDate] = useState(initialRange.end);
  const [studentId, setStudentId] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');

  const summary = useAttendanceSummary({ schoolClassId: schoolClassId || undefined, startDate, endDate });
  const allRows = summary.data ?? [];

  const studentOptions = useMemo(() => {
    const byId = new Map(allRows.map((row) => [row.student.id, row.student]));
    return [...byId.values()].sort((a, b) => fullName(a).localeCompare(fullName(b)));
  }, [allRows]);

  const rows = useMemo(
    () =>
      allRows
        .filter((row) => !studentId || row.student.id === studentId)
        .filter((row) => matchesStatus(row, status)),
    [allRows, studentId, status],
  );

  const className = schoolClassId ? classes.data?.find((c) => c.id === schoolClassId)?.name : 'Toutes les classes';
  const title = `Rapport de présence — ${className} — ${startDate} au ${endDate}`;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-zinc-900">Rapports</h1>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-500">Classe</label>
          <select
            value={schoolClassId}
            onChange={(e) => {
              setSchoolClassId(e.target.value);
              setStudentId('');
            }}
            className="text-sm border border-zinc-200 rounded-lg px-2 py-1.5"
          >
            <option value="">Toutes les classes</option>
            {(classes.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-500">Élève</label>
          <select
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            className="text-sm border border-zinc-200 rounded-lg px-2 py-1.5"
          >
            <option value="">Tous les élèves</option>
            {studentOptions.map((student) => (
              <option key={student.id} value={student.id}>
                {fullName(student)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-500">Statut</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
            className="text-sm border border-zinc-200 rounded-lg px-2 py-1.5"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-500">Du</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="text-sm border border-zinc-200 rounded-lg px-2 py-1.5"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-500">Au</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="text-sm border border-zinc-200 rounded-lg px-2 py-1.5"
          />
        </div>

        <div className="flex-1" />

        <button
          type="button"
          disabled={rows.length === 0}
          onClick={() => exportAttendanceSummaryPdf(rows, title, `rapport-presence-${startDate}-${endDate}.pdf`)}
          className="rounded-lg bg-zinc-900 text-white text-sm font-medium px-4 py-2 hover:bg-zinc-800 disabled:opacity-50"
        >
          Exporter en PDF
        </button>
        <button
          type="button"
          disabled={rows.length === 0}
          onClick={() => exportAttendanceSummaryExcel(rows, `rapport-presence-${startDate}-${endDate}.xlsx`)}
          className="rounded-lg border border-zinc-200 text-sm font-medium px-4 py-2 text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
        >
          Exporter en Excel
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs font-medium text-zinc-500">
              <th className="p-3">Élève</th>
              <th className="p-3">Classe</th>
              <th className="p-3 text-right">Présences</th>
              <th className="p-3 text-right">Retards</th>
              <th className="p-3 text-right">Absences justifiées</th>
              <th className="p-3 text-right">Absences non justifiées</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => {
              return (
                <tr key={row.student.id}>
                  <td className="p-3 font-medium text-zinc-900">{fullName(row.student)}</td>
                  <td className="p-3 text-zinc-500">
                    {row.student.schoolClass.name} · {row.student.schoolClass.promotion}
                  </td>
                  <td className="p-3 text-right tabular-nums">{row.presencesCount}</td>
                  <td className="p-3 text-right tabular-nums">{row.lateCount}</td>
                  <td className="p-3 text-right tabular-nums">{row.absencesJustifiedCount}</td>
                  <td className="p-3 text-right tabular-nums">{row.absencesUnjustifiedCount}</td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="p-4 text-sm text-zinc-400">
                  Aucune donnée sur cette période.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
