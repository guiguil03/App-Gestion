'use client';

import { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CardDetailPanel } from '@/components/cards/card-detail-panel';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { SearchInput } from '@/components/ui/search-input';
import { TableRowsSkeleton } from '@/components/ui/skeleton';
import { useClasses } from '@/lib/hooks/useClasses';
import { useCards, useIssueBatch, useIssueCard, useRevokeCard } from '@/lib/hooks/useCards';
import { useCardPrint } from '@/lib/cards/useCardPrint';

// useSearchParams() force un bailout CSR côté Next.js : la page doit être
// enveloppée dans une frontière Suspense, sinon `next build` échoue (même
// contrainte que la page Élèves).
export default function CartesPage() {
  return (
    <Suspense fallback={null}>
      <CartesPageContent />
    </Suspense>
  );
}

function CartesPageContent() {
  const cards = useCards();
  const classes = useClasses();
  const issueCard = useIssueCard();
  const issueBatch = useIssueBatch();
  const revokeCard = useRevokeCard();
  const cardPrint = useCardPrint();
  const searchParams = useSearchParams();
  const [classFilter, setClassFilter] = useState(searchParams.get('classId') ?? '');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detailStudentId, setDetailStudentId] = useState<string | null>(null);
  const [confirmBatchIssue, setConfirmBatchIssue] = useState(false);

  const filtered = useMemo(() => {
    const all = cards.data ?? [];
    const byClass = classFilter ? all.filter((c) => c.student.schoolClass.id === classFilter) : all;
    const term = search.trim().toLowerCase();
    if (!term) return byClass;
    return byClass.filter((c) => {
      const { student } = c;
      return [student.lastName, student.middleName, student.firstName].filter(Boolean).join(' ').toLowerCase().includes(term);
    });
  }, [cards.data, classFilter, search]);

  const detailStatus = useMemo(
    () => (cards.data ?? []).find((c) => c.student.id === detailStudentId) ?? null,
    [cards.data, detailStudentId],
  );

  const selectedPrintable = useMemo(
    () =>
      filtered
        .filter((c) => selectedIds.has(c.student.id) && c.activeCard)
        .map((c) => ({
          student: c.student,
          qrValue: c.activeCard!.qrCode,
          cardId: c.activeCard!.id,
          issuedAt: c.activeCard!.issuedAt,
        })),
    [filtered, selectedIds],
  );

  const classFilterName = classFilter ? (classes.data ?? []).find((c) => c.id === classFilter)?.name : null;

  function toggleSelected(studentId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  }

  function cardStatusLabel(status: (typeof filtered)[number]) {
    if (status.activeCard) return `Active depuis le ${new Date(status.activeCard.issuedAt).toLocaleDateString('fr-FR')}`;
    if (status.history.length > 0) {
      const last = status.history[0];
      return `Révoquée le ${new Date(last.revokedAt).toLocaleDateString('fr-FR')}`;
    }
    return 'Aucune';
  }

  return (
    <div className="space-y-6">
      {cardPrint.portal}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-zinc-900">Cartes élève</h1>
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput value={search} onChange={setSearch} placeholder="Rechercher un élève…" />
          <select
            value={classFilter}
            onChange={(e) => {
              setClassFilter(e.target.value);
              setSelectedIds(new Set());
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
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={!classFilter || issueBatch.isPending}
          onClick={() => classFilter && setConfirmBatchIssue(true)}
          className="rounded-lg bg-zinc-900 text-white text-sm font-medium px-4 py-2 hover:bg-zinc-800 disabled:opacity-50"
          title={classFilter ? undefined : 'Sélectionne une classe pour émettre les cartes manquantes'}
        >
          {issueBatch.isPending ? 'Émission…' : 'Émettre les cartes manquantes'}
        </button>
        <button
          type="button"
          disabled={selectedPrintable.length === 0 || cardPrint.busy}
          onClick={() => void cardPrint.print(selectedPrintable)}
          className="rounded-lg border border-zinc-200 text-sm font-medium px-4 py-2 text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
        >
          Imprimer la sélection ({selectedPrintable.length})
        </button>
        <button
          type="button"
          disabled={selectedPrintable.length === 0 || cardPrint.busy}
          onClick={() => void cardPrint.downloadPdf(selectedPrintable, 'cartes-eleves.pdf')}
          className="rounded-lg border border-zinc-200 text-sm font-medium px-4 py-2 text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
        >
          Télécharger en PDF ({selectedPrintable.length})
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs font-medium text-zinc-500">
              <th className="p-3 w-8" />
              <th className="p-3">Élève</th>
              <th className="p-3">Classe</th>
              <th className="p-3">Statut de la carte</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {cards.isLoading && <TableRowsSkeleton rows={5} cols={5} />}
            {!cards.isLoading &&
              filtered.map((status) => {
                const { student } = status;
                const fullName = [student.lastName, student.middleName, student.firstName].filter(Boolean).join(' ');
                return (
                  <tr key={student.id}>
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(student.id)}
                        disabled={!status.activeCard}
                        onChange={() => toggleSelected(student.id)}
                        className="h-4 w-4"
                      />
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        {student.photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={student.photoUrl} alt={fullName} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-zinc-100 text-zinc-400 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                            {fullName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="font-semibold text-zinc-900">{fullName}</span>
                      </div>
                    </td>
                    <td className="p-3 text-zinc-500">{student.schoolClass.name}</td>
                    <td className="p-3 text-zinc-500">{cardStatusLabel(status)}</td>
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        onClick={() => setDetailStudentId(student.id)}
                        className="text-xs font-medium text-emerald-600 hover:text-emerald-700 whitespace-nowrap"
                      >
                        Voir
                      </button>
                    </td>
                  </tr>
                );
              })}
            {!cards.isLoading && filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="p-4 text-sm text-zinc-400">
                  Aucun élève.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {detailStatus && (
        <CardDetailPanel
          status={detailStatus}
          onClose={() => setDetailStudentId(null)}
          onIssue={() => issueCard.mutate(detailStatus.student.id)}
          onRevoke={(cardId) => revokeCard.mutate(cardId)}
          onPrint={(card) => void cardPrint.print([card])}
          onDownloadPdf={(card) => void cardPrint.downloadPdf([card], `carte-${card.student.lastName}.pdf`)}
          isIssuing={issueCard.isPending}
          isRevoking={revokeCard.isPending}
          isPrintBusy={cardPrint.busy}
        />
      )}

      <ConfirmDialog
        open={confirmBatchIssue}
        title="Émettre les cartes manquantes ?"
        description={`Génère une carte pour chaque élève de la classe${classFilterName ? ` « ${classFilterName} »` : ''} qui n'en a pas encore.`}
        confirmLabel="Émettre"
        isLoading={issueBatch.isPending}
        onCancel={() => setConfirmBatchIssue(false)}
        onConfirm={() => {
          if (classFilter) issueBatch.mutate(classFilter, { onSuccess: () => setConfirmBatchIssue(false) });
        }}
      />
    </div>
  );
}
