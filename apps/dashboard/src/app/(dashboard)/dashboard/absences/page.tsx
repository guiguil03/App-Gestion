'use client';

import { useMemo, useState } from 'react';
import { SearchInput } from '@/components/ui/search-input';
import { TableRowsSkeleton } from '@/components/ui/skeleton';
import { useAbsences, useJustifyAbsence } from '@/lib/hooks/useAbsences';

export default function AbsencesPage() {
  const absences = useAbsences();
  const justify = useJustifyAbsence();
  const [reasonDrafts, setReasonDrafts] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const all = absences.data ?? [];
    const term = search.trim().toLowerCase();
    if (!term) return all;
    return all.filter((a) => `${a.student.firstName} ${a.student.lastName}`.toLowerCase().includes(term));
  }, [absences.data, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-zinc-900">Absences</h1>
        <SearchInput value={search} onChange={setSearch} placeholder="Rechercher un élève…" />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs font-medium text-zinc-500">
              <th className="p-3">Élève</th>
              <th className="p-3">Date</th>
              <th className="p-3">Statut</th>
              <th className="p-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {absences.isLoading && <TableRowsSkeleton rows={5} cols={4} />}
            {!absences.isLoading &&
              filtered.map((absence) => (
                <tr key={absence.id}>
                  <td className="p-3 font-semibold text-zinc-900">
                    {absence.student.firstName} {absence.student.lastName}
                  </td>
                  <td className="p-3 text-zinc-500">{absence.date}</td>
                  <td className="p-3">
                    {absence.justified ? (
                      <span className="inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600">
                        Justifiée{absence.justificationReason ? ` — ${absence.justificationReason}` : ''}
                      </span>
                    ) : (
                      <span className="inline-block rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
                        Non justifiée
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    {!absence.justified && (
                      <div className="flex justify-end gap-2">
                        <input
                          value={reasonDrafts[absence.id] ?? ''}
                          onChange={(e) => setReasonDrafts((prev) => ({ ...prev, [absence.id]: e.target.value }))}
                          placeholder="Motif"
                          className="text-sm border border-zinc-200 rounded-lg px-2 py-1.5 w-32 sm:w-auto"
                        />
                        <button
                          type="button"
                          onClick={() => justify.mutate({ id: absence.id, reason: reasonDrafts[absence.id] ?? '' })}
                          disabled={!reasonDrafts[absence.id]}
                          className="text-xs font-medium text-emerald-600 hover:text-emerald-700 disabled:opacity-40 whitespace-nowrap"
                        >
                          Justifier
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            {!absences.isLoading && filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="p-4 text-sm text-zinc-400">
                  Aucune absence.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
