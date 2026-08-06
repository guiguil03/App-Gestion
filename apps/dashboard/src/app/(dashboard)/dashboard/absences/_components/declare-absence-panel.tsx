'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { getErrorMessage } from '@/lib/api/errors';
import { useClasses } from '@/lib/hooks/useClasses';
import { useStudents } from '@/lib/hooks/useStudents';
import { useCreateAbsence } from '@/lib/hooks/useAbsences';

function todayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/**
 * Déclarer une absence avant sa détection automatique (ex. un parent
 * prévient par téléphone) plutôt que d'attendre le cron + de justifier après
 * coup. N'importe quelle date fonctionne (passée ou future) — voir
 * AbsencesService.create côté backend, idempotent vis-à-vis du cron.
 */
export function DeclareAbsencePanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [schoolClassId, setSchoolClassId] = useState('');
  const [studentId, setStudentId] = useState('');
  const [date, setDate] = useState(todayKey());
  const [justified, setJustified] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const classes = useClasses();
  const students = useStudents();
  const createAbsence = useCreateAbsence();

  const classStudents = (students.data ?? [])
    .filter((s) => s.schoolClassId === schoolClassId)
    .sort((a, b) => a.lastName.localeCompare(b.lastName));

  function reset() {
    setSchoolClassId('');
    setStudentId('');
    setDate(todayKey());
    setJustified(false);
    setReason('');
    setError(null);
  }

  async function handleSubmit() {
    if (!studentId) return;
    setError(null);
    try {
      await createAbsence.mutateAsync({
        studentId,
        date,
        justified: justified || undefined,
        justificationReason: justified && reason.trim() ? reason.trim() : undefined,
      });
      reset();
      setIsOpen(false);
    } catch (err) {
      setError(getErrorMessage(err, 'Impossible de déclarer cette absence. Réessaie.'));
    }
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
      >
        <Plus size={14} /> Déclarer une absence
      </button>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-700">Déclarer une absence à l&apos;avance</h2>
        <button
          type="button"
          onClick={() => {
            reset();
            setIsOpen(false);
          }}
          className="p-1 text-zinc-400 hover:text-zinc-600"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          value={schoolClassId}
          onChange={(e) => {
            setSchoolClassId(e.target.value);
            setStudentId('');
          }}
          className="text-sm border border-zinc-200 rounded-lg px-2 py-1.5"
        >
          <option value="">Classe…</option>
          {(classes.data ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          disabled={!schoolClassId}
          className="text-sm border border-zinc-200 rounded-lg px-2 py-1.5 disabled:opacity-50"
        >
          <option value="">Élève…</option>
          {classStudents.map((s) => (
            <option key={s.id} value={s.id}>
              {[s.lastName, s.middleName, s.firstName].filter(Boolean).join(' ')}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="text-sm border border-zinc-200 rounded-lg px-2 py-1.5"
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-zinc-600">
        <input
          type="checkbox"
          checked={justified}
          onChange={(e) => setJustified(e.target.checked)}
          className="h-4 w-4"
        />
        Absence déjà justifiée
      </label>

      {justified && (
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Motif (ex. rendez-vous médical)"
          className="w-full text-sm border border-zinc-200 rounded-lg px-3 py-1.5"
        />
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}

      <button
        type="button"
        onClick={() => void handleSubmit()}
        disabled={!studentId || createAbsence.isPending}
        className="rounded-lg bg-zinc-900 text-white text-sm font-medium px-4 py-1.5 hover:bg-zinc-800 disabled:opacity-50"
      >
        {createAbsence.isPending ? 'Déclaration…' : 'Déclarer'}
      </button>
    </div>
  );
}
