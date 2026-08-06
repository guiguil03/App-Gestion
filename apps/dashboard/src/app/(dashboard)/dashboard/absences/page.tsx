'use client';

import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { Pagination } from '@/components/ui/pagination';
import { SearchInput } from '@/components/ui/search-input';
import { TableRowsSkeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue';
import { useAbsencesPaginated, useJustifyAbsence, useJustifyAbsencesBulk } from '@/lib/hooks/useAbsences';
import { DeclareAbsencePanel } from './_components/declare-absence-panel';

const PAGE_SIZE = 25;

const TABS = [
  { value: 'unjustified', label: 'Non justifiées' },
  { value: 'justified', label: 'Justifiées' },
] as const;

type Tab = (typeof TABS)[number]['value'];

export default function AbsencesPage() {
  const [tab, setTab] = useState<Tab>('unjustified');
  const justify = useJustifyAbsence();
  const justifyBulk = useJustifyAbsencesBulk();
  const [reasonDrafts, setReasonDrafts] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkReason, setBulkReason] = useState('');
  const debouncedSearch = useDebouncedValue(search);

  useEffect(() => {
    setPage(1);
    setSelectedIds(new Set());
  }, [debouncedSearch, tab]);

  const absences = useAbsencesPaginated({
    search: debouncedSearch || undefined,
    justified: tab === 'justified',
    page,
    pageSize: PAGE_SIZE,
  });
  const rows = absences.data?.items ?? [];
  const total = absences.data?.total ?? 0;
  const allChecked = rows.length > 0 && rows.every((a) => selectedIds.has(a.id));

  function goToPage(nextPage: number) {
    setPage(nextPage);
    setSelectedIds(new Set());
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds((prev) => {
      if (allChecked) return new Set();
      const next = new Set(prev);
      rows.forEach((a) => next.add(a.id));
      return next;
    });
  }

  function handleJustifyBulk() {
    justifyBulk.mutate(
      { absenceIds: [...selectedIds], reason: bulkReason },
      {
        onSuccess: () => {
          setSelectedIds(new Set());
          setBulkReason('');
        },
      },
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-zinc-900">Absences</h1>
        <SearchInput value={search} onChange={setSearch} placeholder="Rechercher un élève…" />
      </div>

      <DeclareAbsencePanel />

      <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={cn(
              'rounded-md px-4 py-1.5 text-sm font-medium transition-colors',
              tab === t.value ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-900',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'unjustified' && selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <span className="text-sm font-medium text-emerald-800 whitespace-nowrap">
            {selectedIds.size} absence{selectedIds.size > 1 ? 's' : ''} sélectionnée{selectedIds.size > 1 ? 's' : ''}
          </span>
          <input
            value={bulkReason}
            onChange={(e) => setBulkReason(e.target.value)}
            placeholder="Motif commun (ex. grève des transports)"
            className="flex-1 min-w-[200px] text-sm border border-emerald-200 rounded-lg px-3 py-1.5"
          />
          <button
            type="button"
            onClick={handleJustifyBulk}
            disabled={!bulkReason.trim() || justifyBulk.isPending}
            className="rounded-lg bg-emerald-600 text-white text-sm font-medium px-4 py-1.5 hover:bg-emerald-700 disabled:opacity-50 whitespace-nowrap"
          >
            {justifyBulk.isPending ? 'Justification…' : `Justifier ${selectedIds.size}`}
          </button>
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            title="Annuler la sélection"
            className="p-1.5 text-emerald-700 hover:bg-emerald-100 rounded-lg"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs font-medium text-zinc-500">
              {tab === 'unjustified' && (
                <th className="p-3 w-8">
                  <input
                    type="checkbox"
                    checked={allChecked}
                    onChange={toggleSelectAll}
                    disabled={rows.length === 0}
                    className="h-4 w-4"
                    aria-label="Tout sélectionner"
                  />
                </th>
              )}
              <th className="p-3">Élève</th>
              <th className="p-3">Date</th>
              {tab === 'justified' ? <th className="p-3">Motif</th> : <th className="p-3">Statut</th>}
              {tab === 'unjustified' && <th className="p-3 text-right">Action</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {absences.isLoading && <TableRowsSkeleton rows={5} cols={tab === 'unjustified' ? 5 : 3} />}
            {!absences.isLoading &&
              rows.map((absence) => (
                <tr key={absence.id}>
                  {tab === 'unjustified' && (
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(absence.id)}
                        onChange={() => toggleSelected(absence.id)}
                        className="h-4 w-4"
                      />
                    </td>
                  )}
                  <td className="p-3 font-semibold text-zinc-900">
                    {absence.student.firstName} {absence.student.lastName}
                  </td>
                  <td className="p-3 text-zinc-500">{absence.date}</td>
                  {tab === 'justified' ? (
                    <td className="p-3 text-zinc-500">{absence.justificationReason || '—'}</td>
                  ) : (
                    <td className="p-3">
                      <span className="inline-block rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
                        Non justifiée
                      </span>
                    </td>
                  )}
                  {tab === 'unjustified' && (
                    <td className="p-3 text-right">
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
                    </td>
                  )}
                </tr>
              ))}
            {!absences.isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={tab === 'unjustified' ? 5 : 3} className="p-4 text-sm text-zinc-400">
                  {tab === 'unjustified' ? 'Aucune absence à traiter.' : 'Aucune absence justifiée.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={goToPage} />
    </div>
  );
}
