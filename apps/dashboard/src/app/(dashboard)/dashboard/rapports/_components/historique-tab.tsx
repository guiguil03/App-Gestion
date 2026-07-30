'use client';

import { useMemo, useState } from 'react';
import { TableRowsSkeleton } from '@/components/ui/skeleton';
import { useClasses } from '@/lib/hooks/useClasses';
import { useAttendanceHistory } from '@/lib/hooks/useReports';
import { useStudents } from '@/lib/hooks/useStudents';
import { exportAttendanceHistoryExcel, exportAttendanceHistoryPdf } from '@/lib/reports/export';
import type { AttendanceHistoryEntry } from '@/types/reports';

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function defaultRange(): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 6);
  return { start: isoDate(start), end: isoDate(end) };
}

const STATUS_OPTIONS = [
  { value: '', label: 'Tous les statuts' },
  { value: 'present', label: 'Présent' },
  { value: 'late', label: 'En retard' },
  { value: 'absent', label: 'Absent' },
] as const;

const STATUS_BADGE: Record<AttendanceHistoryEntry['status'], string> = {
  PRESENT: 'bg-emerald-50 text-emerald-600',
  LATE: 'bg-amber-50 text-amber-600',
  ABSENT: 'bg-red-50 text-red-600',
};

const STATUS_LABEL: Record<AttendanceHistoryEntry['status'], string> = {
  PRESENT: 'Présent',
  LATE: 'En retard',
  ABSENT: 'Absent',
};

function fullName(student: AttendanceHistoryEntry['student']): string {
  return [student.lastName, student.middleName, student.firstName].filter(Boolean).join(' ');
}

export function HistoriqueTab() {
  const classes = useClasses();
  const students = useStudents();
  const initialRange = useMemo(defaultRange, []);
  const [schoolClassId, setSchoolClassId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [status, setStatus] = useState<'' | 'present' | 'late' | 'absent'>('');
  const [startDate, setStartDate] = useState(initialRange.start);
  const [endDate, setEndDate] = useState(initialRange.end);

  const history = useAttendanceHistory({
    schoolClassId: schoolClassId || undefined,
    studentId: studentId || undefined,
    status: status || undefined,
    startDate,
    endDate,
  });
  const rows = history.data ?? [];

  const studentOptions = useMemo(() => {
    const all = students.data ?? [];
    const byClass = schoolClassId ? all.filter((s) => s.schoolClassId === schoolClassId) : all;
    return [...byClass].sort((a, b) =>
      [a.lastName, a.middleName, a.firstName].filter(Boolean).join(' ').localeCompare(
        [b.lastName, b.middleName, b.firstName].filter(Boolean).join(' '),
      ),
    );
  }, [students.data, schoolClassId]);

  const className = schoolClassId ? classes.data?.find((c) => c.id === schoolClassId)?.name : 'Toutes les classes';
  const title = `Historique de présence — ${className} — ${startDate} au ${endDate}`;

  return (
    <div className="space-y-6">
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
                {[student.lastName, student.middleName, student.firstName].filter(Boolean).join(' ')}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-500">Statut</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
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
          onClick={() => exportAttendanceHistoryPdf(rows, title, `historique-presence-${startDate}-${endDate}.pdf`)}
          className="rounded-lg bg-zinc-900 text-white text-sm font-medium px-4 py-2 hover:bg-zinc-800 disabled:opacity-50"
        >
          Exporter en PDF
        </button>
        <button
          type="button"
          disabled={rows.length === 0}
          onClick={() => exportAttendanceHistoryExcel(rows, `historique-presence-${startDate}-${endDate}.xlsx`)}
          className="rounded-lg border border-zinc-200 text-sm font-medium px-4 py-2 text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
        >
          Exporter en Excel
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs font-medium text-zinc-500">
              <th className="p-3">Date</th>
              <th className="p-3">Élève</th>
              <th className="p-3">Classe</th>
              <th className="p-3">Statut</th>
              <th className="p-3">Heure</th>
              <th className="p-3">Motif</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {history.isLoading && <TableRowsSkeleton rows={6} cols={6} />}
            {!history.isLoading &&
              rows.map((entry, index) => (
                <tr key={`${entry.student.id}-${entry.date}-${index}`}>
                  <td className="p-3 text-zinc-500 tabular-nums">{entry.date}</td>
                  <td className="p-3 font-medium text-zinc-900">{fullName(entry.student)}</td>
                  <td className="p-3 text-zinc-500">
                    {entry.student.schoolClass.name} · {entry.student.schoolClass.promotion}
                  </td>
                  <td className="p-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[entry.status]}`}>
                      {STATUS_LABEL[entry.status]}
                    </span>
                  </td>
                  <td className="p-3 text-zinc-500 tabular-nums">
                    {entry.recordedAt
                      ? new Date(entry.recordedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                      : '—'}
                  </td>
                  <td className="p-3 text-zinc-500">
                    {entry.status === 'ABSENT'
                      ? entry.justified
                        ? `Justifiée${entry.justificationReason ? ` — ${entry.justificationReason}` : ''}`
                        : 'Non justifiée'
                      : '—'}
                  </td>
                </tr>
              ))}
            {!history.isLoading && rows.length === 0 && (
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
