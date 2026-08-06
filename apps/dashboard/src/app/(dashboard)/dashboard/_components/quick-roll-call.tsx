'use client';

import { useState } from 'react';
import { getErrorMessage } from '@/lib/api/errors';
import { useClasses } from '@/lib/hooks/useClasses';
import { useStudents } from '@/lib/hooks/useStudents';
import { usePresenceList, useRecordManualAttendance } from '@/lib/hooks/useAttendance';

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function isoTime(date: Date): string {
  return date.toTimeString().slice(0, 5);
}

export function QuickRollCall() {
  const [schoolClassId, setSchoolClassId] = useState('');
  const [pendingStudentId, setPendingStudentId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ studentId: string; message: string } | null>(null);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);

  const classes = useClasses();
  const students = useStudents();
  const today = isoDate(new Date());
  const presences = usePresenceList({ date: today, schoolClassId }, { enabled: !!schoolClassId });
  const recordManualAttendance = useRecordManualAttendance();

  const classStudents = (students.data ?? [])
    .filter((s) => s.schoolClassId === schoolClassId)
    .sort((a, b) => a.lastName.localeCompare(b.lastName));
  const unmarkedStudents = classStudents.filter(
    (student) => !presences.data?.some((r) => r.student.id === student.id),
  );

  async function handleMark(studentId: string, isLate: boolean) {
    setRowError(null);
    setPendingStudentId(studentId);
    try {
      await recordManualAttendance.mutateAsync({
        studentId,
        input: { date: today, time: isoTime(new Date()), isLate },
      });
    } catch (error) {
      setRowError({ studentId, message: getErrorMessage(error, "Impossible d'enregistrer la présence. Réessaie.") });
    } finally {
      setPendingStudentId(null);
    }
  }

  async function handleMarkAllPresent() {
    if (unmarkedStudents.length === 0) return;
    const confirmed = window.confirm(`Marquer ${unmarkedStudents.length} élève(s) comme présent(s) maintenant ?`);
    if (!confirmed) return;

    setBulkError(null);
    setIsMarkingAll(true);
    try {
      const results = await Promise.allSettled(
        unmarkedStudents.map((student) =>
          recordManualAttendance.mutateAsync({
            studentId: student.id,
            input: { date: today, time: isoTime(new Date()), isLate: false },
          }),
        ),
      );
      const failedCount = results.filter((r) => r.status === 'rejected').length;
      if (failedCount > 0) {
        setBulkError(
          `${failedCount} pointage(s) sur ${unmarkedStudents.length} ont échoué. Réessaie pour les élèves concernés.`,
        );
      }
    } finally {
      setIsMarkingAll(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-zinc-700">Pointage rapide</h2>
        <select
          value={schoolClassId}
          onChange={(e) => setSchoolClassId(e.target.value)}
          className="text-sm border border-zinc-200 rounded-lg px-2 py-1.5"
        >
          <option value="">Sélectionner une classe</option>
          {(classes.data ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {!schoolClassId && <p className="text-sm text-zinc-400">Choisis une classe pour faire l&apos;appel.</p>}

      {schoolClassId && unmarkedStudents.length > 0 && (
        <div className="mb-3 flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={isMarkingAll}
            onClick={() => void handleMarkAllPresent()}
            className="rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-50 disabled:opacity-50"
          >
            {isMarkingAll ? 'Marquage en cours…' : `Marquer les ${unmarkedStudents.length} restant(s) présent(s)`}
          </button>
          {bulkError && <p className="text-xs text-red-600">{bulkError}</p>}
        </div>
      )}

      {schoolClassId && (
        <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
          {classStudents.map((student) => {
            const record = presences.data?.find((r) => r.student.id === student.id);
            const fullName = [student.lastName, student.middleName, student.firstName].filter(Boolean).join(' ');
            const isPending = pendingStudentId === student.id;

            return (
              <div key={student.id} className="py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-900 truncate">{fullName}</p>
                  {rowError?.studentId === student.id && <p className="text-xs text-red-600 mt-0.5">{rowError.message}</p>}
                </div>

                {record ? (
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${
                      record.isLate ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
                    }`}
                  >
                    {record.isLate ? 'En retard' : 'Présent'} à{' '}
                    {new Date(record.recordedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                ) : (
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => void handleMark(student.id, false)}
                      className="rounded-full border border-emerald-200 px-2.5 py-1 text-xs font-medium text-emerald-600 hover:bg-emerald-50 disabled:opacity-50"
                    >
                      {isPending ? '…' : 'Présent'}
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => void handleMark(student.id, true)}
                      className="rounded-full border border-amber-200 px-2.5 py-1 text-xs font-medium text-amber-600 hover:bg-amber-50 disabled:opacity-50"
                    >
                      {isPending ? '…' : 'En retard'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {classStudents.length === 0 && <p className="text-sm text-zinc-400 py-2">Aucun élève dans cette classe.</p>}
        </div>
      )}
    </div>
  );
}
