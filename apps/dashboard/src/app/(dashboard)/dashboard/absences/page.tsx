'use client';

import { useState } from 'react';
import { useAbsences, useJustifyAbsence } from '@/lib/hooks/useAbsences';

export default function AbsencesPage() {
  const absences = useAbsences();
  const justify = useJustifyAbsence();
  const [reasonDrafts, setReasonDrafts] = useState<Record<string, string>>({});

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-zinc-900">Absences</h1>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100">
        {(absences.data ?? []).map((absence) => (
          <div key={absence.id} className="p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-zinc-900">
                {absence.student.firstName} {absence.student.lastName}
              </p>
              <p className="text-xs text-zinc-500">
                {absence.date}
                {absence.justified ? ` — justifiée (${absence.justificationReason})` : ' — non justifiée'}
              </p>
            </div>
            {!absence.justified && (
              <div className="flex gap-2">
                <input
                  value={reasonDrafts[absence.id] ?? ''}
                  onChange={(e) => setReasonDrafts((prev) => ({ ...prev, [absence.id]: e.target.value }))}
                  placeholder="Motif"
                  className="text-sm border border-zinc-200 rounded-lg px-2 py-1.5"
                />
                <button
                  type="button"
                  onClick={() => justify.mutate({ id: absence.id, reason: reasonDrafts[absence.id] ?? '' })}
                  disabled={!reasonDrafts[absence.id]}
                  className="text-xs font-medium text-emerald-600 hover:text-emerald-700 disabled:opacity-40"
                >
                  Justifier
                </button>
              </div>
            )}
          </div>
        ))}
        {absences.data?.length === 0 && <p className="p-4 text-sm text-zinc-400">Aucune absence.</p>}
      </div>
    </div>
  );
}
