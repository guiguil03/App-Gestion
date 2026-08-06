'use client';

import { useState } from 'react';
import { Check, CheckCircle2, Clock, Download, FileSpreadsheet, Pencil, QrCode, Smartphone, Trash2, X } from 'lucide-react';
import { SearchInput } from '@/components/ui/search-input';
import { TableRowsSkeleton } from '@/components/ui/skeleton';
import { getErrorMessage } from '@/lib/api/errors';
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue';
import { useClasses } from '@/lib/hooks/useClasses';
import { useDeleteAttendanceRecord, usePresenceList, useUpdateAttendanceRecord } from '@/lib/hooks/useAttendance';
import { exportPresenceListExcel, exportPresenceListPdf } from '@/lib/reports/export';
import type { PresenceRecord } from '@/types/attendance';
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
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTime, setEditTime] = useState('');
  const [editIsLate, setEditIsLate] = useState(false);

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
  const deleteRecord = useDeleteAttendanceRecord();
  const updateRecord = useUpdateAttendanceRecord();

  const exportTitle = `Présences — ${selectedClass?.name ?? 'Toutes les classes'} — ${date}`;
  const exportFilenameBase = `presences-${classFilter ? `${selectedClass?.name ?? classFilter}-` : ''}${date}`;

  async function handleDelete(recordId: string) {
    if (!window.confirm('Supprimer ce pointage manuel ? Cette action est irréversible.')) return;
    setRowError(null);
    setPendingDeleteId(recordId);
    try {
      await deleteRecord.mutateAsync(recordId);
    } catch (error) {
      setRowError({ id: recordId, message: getErrorMessage(error, 'Impossible de supprimer ce pointage. Réessaie.') });
    } finally {
      setPendingDeleteId(null);
    }
  }

  function startEdit(record: PresenceRecord) {
    setEditingId(record.id);
    setEditTime(new Date(record.recordedAt).toTimeString().slice(0, 5));
    setEditIsLate(record.isLate);
    setRowError(null);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  // Le pointage édité reste par construction dans le même jour (les lignes
  // affichées correspondent déjà toutes à `date`, voir AttendanceService.
  // listForDay) — seule l'heure/le retard changent, pas la date elle-même.
  async function handleSaveEdit(recordId: string) {
    setRowError(null);
    try {
      await updateRecord.mutateAsync({ id: recordId, input: { date, time: editTime, isLate: editIsLate } });
      setEditingId(null);
    } catch (error) {
      setRowError({ id: recordId, message: getErrorMessage(error, "Impossible d'enregistrer la modification. Réessaie.") });
    }
  }

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
          <button
            type="button"
            disabled={rows.length === 0}
            onClick={() => exportPresenceListPdf(rows, exportTitle, `${exportFilenameBase}.pdf`)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50 disabled:opacity-40"
          >
            <Download size={14} /> PDF
          </button>
          <button
            type="button"
            disabled={rows.length === 0}
            onClick={() => exportPresenceListExcel(rows, `${exportFilenameBase}.xlsx`)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50 disabled:opacity-40"
          >
            <FileSpreadsheet size={14} /> Excel
          </button>
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
              <th className="p-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {presences.isLoading && <TableRowsSkeleton rows={6} cols={7} />}
            {!presences.isLoading &&
              rows.map((record) => (
                <tr key={record.id}>
                  <td className="p-3 font-semibold text-zinc-900">
                    {record.student.firstName} {record.student.lastName}
                  </td>
                  <td className="p-3 text-zinc-500">{record.student.schoolClass.name}</td>
                  <td className="p-3 text-zinc-500">{record.checkpoint === 'PORTAIL' ? 'Portail' : 'Salle de classe'}</td>
                  {editingId === record.id ? (
                    <td className="p-3">
                      <input
                        type="time"
                        value={editTime}
                        onChange={(e) => setEditTime(e.target.value)}
                        className="text-sm border border-zinc-200 rounded-lg px-2 py-1 tabular-nums"
                      />
                    </td>
                  ) : (
                    <td className="p-3 text-zinc-500 tabular-nums">
                      {new Date(record.recordedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  )}
                  {editingId === record.id ? (
                    <td className="p-3">
                      <label className="inline-flex items-center gap-1.5 text-xs text-zinc-600">
                        <input
                          type="checkbox"
                          checked={editIsLate}
                          onChange={(e) => setEditIsLate(e.target.checked)}
                          className="h-4 w-4"
                        />
                        En retard
                      </label>
                    </td>
                  ) : (
                    <td className="p-3">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          record.isLate ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
                        }`}
                      >
                        {record.isLate ? 'En retard' : 'À l’heure'}
                      </span>
                    </td>
                  )}
                  <td className="p-3 text-zinc-400">
                    <span className="inline-flex items-center gap-1.5">
                      {record.isManual ? <Smartphone size={14} /> : <QrCode size={14} />}
                      {record.isManual ? 'Manuel' : 'Scan'}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    {editingId === record.id ? (
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          disabled={updateRecord.isPending}
                          onClick={() => void handleSaveEdit(record.id)}
                          title="Enregistrer"
                          className="inline-flex items-center rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50 disabled:opacity-40"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          type="button"
                          disabled={updateRecord.isPending}
                          onClick={cancelEdit}
                          title="Annuler"
                          className="inline-flex items-center rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 disabled:opacity-40"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      record.isManual && (
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => startEdit(record)}
                            title="Corriger l'heure/le retard de ce pointage manuel"
                            className="inline-flex items-center rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            disabled={pendingDeleteId === record.id}
                            onClick={() => void handleDelete(record.id)}
                            title="Supprimer ce pointage manuel erroné"
                            className="inline-flex items-center rounded-lg p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )
                    )}
                    {rowError?.id === record.id && <p className="mt-1 text-xs text-red-600">{rowError.message}</p>}
                  </td>
                </tr>
              ))}
            {!presences.isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={7} className="p-4 text-sm text-zinc-400">
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
