'use client';

import { useState } from 'react';
import { CheckCircle2, Clock, Smartphone, QrCode } from 'lucide-react';
import { SearchInput } from '@/components/ui/search-input';
import { TableRowsSkeleton } from '@/components/ui/skeleton';
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue';
import { useClasses } from '@/lib/hooks/useClasses';
import { usePresenceList } from '@/lib/hooks/useAttendance';
import { AddPresencePanel } from './_components/add-presence-panel';

function todayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export default function PresencesPage() {
  const [date, setDate] = useState(todayKey());
  const [classFilter, setClassFilter] = useState('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);

  const classes = useClasses();
  const presences = usePresenceList({
    date,
    schoolClassId: classFilter || undefined,
    search: debouncedSearch || undefined,
  });
  const rows = presences.data ?? [];
  const lateCount = rows.filter((r) => r.isLate).length;
  const selectedClass = (classes.data ?? []).find((c) => c.id === classFilter);
  // Sans recherche : sert à savoir qui, dans la classe sélectionnée, n'a
  // aucun pointage à cette date (voir AddPresencePanel) — indépendant de la
  // recherche texte ci-dessus, qui filtre seulement le tableau affiché.
  const classPresences = usePresenceList(
    { date, schoolClassId: classFilter },
    { enabled: !!classFilter },
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-zinc-900">Présences</h1>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="text-sm border border-zinc-200 rounded-lg px-2 py-1.5"
          />
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="text-sm border border-zinc-200 rounded-lg px-2 py-1.5"
          >
            <option value="">Toutes les classes</option>
            {(classes.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <SearchInput value={search} onChange={setSearch} placeholder="Rechercher un élève…" />
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
          <CheckCircle2 size={16} className="text-emerald-600" />
          <span className="text-sm text-zinc-500">
            <span className="font-semibold text-zinc-900">{rows.length}</span> pointage{rows.length > 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
          <Clock size={16} className="text-amber-600" />
          <span className="text-sm text-zinc-500">
            <span className="font-semibold text-zinc-900">{lateCount}</span> en retard
          </span>
        </div>
      </div>

      {selectedClass ? (
        <AddPresencePanel
          date={date}
          schoolClassId={selectedClass.id}
          className={selectedClass.name}
          existingRecords={classPresences.data ?? []}
        />
      ) : (
        <p className="text-sm text-zinc-400">Sélectionne une classe pour ajouter des présences.</p>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs font-medium text-zinc-500">
              <th className="p-3">Élève</th>
              <th className="p-3">Classe</th>
              <th className="p-3">Checkpoint</th>
              <th className="p-3">Heure</th>
              <th className="p-3">Statut</th>
              <th className="p-3">Origine</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {presences.isLoading && <TableRowsSkeleton rows={6} cols={6} />}
            {!presences.isLoading &&
              rows.map((record) => (
                <tr key={record.id}>
                  <td className="p-3 font-semibold text-zinc-900">
                    {record.student.firstName} {record.student.lastName}
                  </td>
                  <td className="p-3 text-zinc-500">{record.student.schoolClass.name}</td>
                  <td className="p-3 text-zinc-500">{record.checkpoint === 'PORTAIL' ? 'Portail' : 'Salle de classe'}</td>
                  <td className="p-3 text-zinc-500 tabular-nums">
                    {new Date(record.recordedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="p-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        record.isLate ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
                      }`}
                    >
                      {record.isLate ? 'En retard' : 'À l’heure'}
                    </span>
                  </td>
                  <td className="p-3 text-zinc-400">
                    <span className="inline-flex items-center gap-1.5">
                      {record.isManual ? <Smartphone size={14} /> : <QrCode size={14} />}
                      {record.isManual ? 'Manuel' : 'Scan'}
                    </span>
                  </td>
                </tr>
              ))}
            {!presences.isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={6} className="p-4 text-sm text-zinc-400">
                  Aucun pointage pour cette journée.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
