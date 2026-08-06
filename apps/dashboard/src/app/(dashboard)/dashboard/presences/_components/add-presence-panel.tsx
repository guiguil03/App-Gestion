'use client';

import { useState } from 'react';
import { getErrorMessage } from '@/lib/api/errors';
import { useStudents } from '@/lib/hooks/useStudents';
import { useRecordManualAttendance } from '@/lib/hooks/useAttendance';
import type { PresenceRecord } from '@/types/attendance';

function isoTime(date: Date): string {
  return date.toTimeString().slice(0, 5);
}

export function AddPresencePanel({
  date,
  schoolClassId,
  className,
  existingRecords,
}: {
  date: string;
  schoolClassId: string;
  className: string;
  existingRecords: PresenceRecord[];
}) {
  const [pendingStudentId, setPendingStudentId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ studentId: string; message: string } | null>(null);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);

  const students = useStudents();
  const recordManualAttendance = useRecordManualAttendance();

  const classStudents = (students.data ?? [])
    .filter((s) => s.schoolClassId === schoolClassId)
    .sort((a, b) => a.lastName.localeCompare(b.lastName));
  const unmarkedStudents = classStudents.filter(
    (student) => !existingRecords.some((r) => r.student.id === student.id),
  );

  // L'heure de la journée sélectionnée reste "maintenant" pour un pointage du
  // jour, mais tombe à midi pour une date passée (aucune heure de scan réelle
  // à réutiliser — voir AttendanceService.recordManual, la correction pour
  // une date antérieure est une action Direction sans contrainte d'horaire).
  function recordedTime(): string {
    const isToday = date === new Date().toISOString().slice(0, 10);
    return isToday ? isoTime(new Date()) : '12:00';
  }

  async function handleMark(studentId: string, isLate: boolean) {
    setRowError(null);
    setPendingStudentId(studentId);
    try {
      await recordManualAttendance.mutateAsync({
        studentId,
        input: { date, time: recordedTime(), isLate },
      });
    } catch (error) {
      setRowError({ studentId, message: getErrorMessage(error, "Impossible d'enregistrer la présence. Réessaie.") });
    } finally {
      setPendingStudentId(null);
    }
  }

  async function handleMarkAllPresent() {
    if (unmarkedStudents.length === 0) return;
    const confirmed = window.confirm(`Marquer ${unmarkedStudents.length} élève(s) de ${className} comme présent(s) le ${date} ?`);
    if (!confirmed) return;

    setBulkError(null);
    setIsMarkingAll(true);
    try {
      const results = await Promise.allSettled(
        unmarkedStudents.map((student) =>
          recordManualAttendance.mutateAsync({
            studentId: student.id,
            input: { date, time: recordedTime(), isLate: false },
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

  if (classStudents.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-zinc-700">Ajouter une présence — {className}</h2>
        {unmarkedStudents.length > 0 && (
          <button
            type="button"
            disabled={isMarkingAll}
            onClick={() => void handleMarkAllPresent()}
            className="rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-50 disabled:opacity-50"
          >
            {isMarkingAll ? 'Marquage en cours…' : `Marquer les ${unmarkedStudents.length} restant(s) présent(s)`}
          </button>
        )}
      </div>

      {bulkError && <p className="text-xs text-red-600 mb-3">{bulkError}</p>}

      {unmarkedStudents.length === 0 ? (
        <p className="text-sm text-zinc-400">Tous les élèves de cette classe ont un pointage à cette date.</p>
      ) : (
        <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
          {unmarkedStudents.map((student) => {
            const fullName = [student.lastName, student.middleName, student.firstName].filter(Boolean).join(' ');
            const isPending = pendingStudentId === student.id;

            return (
              <div key={student.id} className="py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-900 truncate">{fullName}</p>
                  {rowError?.studentId === student.id && <p className="text-xs text-red-600 mt-0.5">{rowError.message}</p>}
                </div>
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
