'use client';

import { X } from 'lucide-react';
import { StudentCardVisual } from '@/components/cards/student-card-visual';
import { useQrDataUrl } from '@/lib/cards/useQrDataUrl';
import type { PrintableCard } from '@/lib/cards/useCardPrint';
import type { StudentCardStatus } from '@/types/cards';

type CardDetailPanelProps = {
  status: StudentCardStatus;
  onClose: () => void;
  onIssue: () => void;
  onRevoke: (cardId: string) => void;
  onPrint: (card: PrintableCard) => void;
  onDownloadPdf: (card: PrintableCard) => void;
  isIssuing: boolean;
  isRevoking: boolean;
  isPrintBusy: boolean;
};

export function CardDetailPanel({
  status,
  onClose,
  onIssue,
  onRevoke,
  onPrint,
  onDownloadPdf,
  isIssuing,
  isRevoking,
  isPrintBusy,
}: CardDetailPanelProps) {
  const { student, activeCard, history } = status;
  const qrDataUrl = useQrDataUrl(activeCard?.qrCode ?? null);
  const fullName = [student.lastName, student.middleName, student.firstName].filter(Boolean).join(' ');

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div
        className="h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-zinc-900">Carte élève</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-50 hover:text-zinc-900">
            <X size={18} />
          </button>
        </div>

        <p className="mt-1 text-sm text-zinc-500">
          {fullName} — {student.schoolClass.name}
        </p>

        <div className="mt-5 flex justify-center">
          <StudentCardVisual student={student} qrDataUrl={activeCard ? qrDataUrl : null} />
        </div>

        <div className="mt-5 space-y-2">
          {activeCard ? (
            <>
              <button
                type="button"
                disabled={isPrintBusy}
                onClick={() => onPrint({ student, qrValue: activeCard.qrCode })}
                className="w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
              >
                {isPrintBusy ? 'Préparation…' : 'Imprimer'}
              </button>
              <button
                type="button"
                disabled={isPrintBusy}
                onClick={() => onDownloadPdf({ student, qrValue: activeCard.qrCode })}
                className="w-full rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
              >
                {isPrintBusy ? 'Préparation…' : 'Télécharger en PDF'}
              </button>
              <button
                type="button"
                disabled={isIssuing}
                onClick={onIssue}
                className="w-full rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
              >
                {isIssuing ? 'Génération…' : 'Perte/vol — réémettre une nouvelle carte'}
              </button>
              <button
                type="button"
                disabled={isRevoking}
                onClick={() => onRevoke(activeCard.id)}
                className="w-full rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                {isRevoking ? 'Révocation…' : 'Révoquer cette carte'}
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={isIssuing}
              onClick={onIssue}
              className="w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              {isIssuing ? 'Émission…' : 'Émettre la carte'}
            </button>
          )}
        </div>

        {history.length > 0 && (
          <div className="mt-6 border-t border-zinc-100 pt-4">
            <p className="text-xs font-semibold text-zinc-500">Historique</p>
            <div className="mt-2 space-y-1.5">
              {history.map((entry) => (
                <p key={entry.id} className="text-xs text-zinc-500">
                  Émise le {new Date(entry.issuedAt).toLocaleDateString('fr-FR')} — révoquée le{' '}
                  {new Date(entry.revokedAt).toLocaleDateString('fr-FR')}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
