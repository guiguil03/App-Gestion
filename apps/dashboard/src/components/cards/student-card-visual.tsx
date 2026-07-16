'use client';

import { forwardRef } from 'react';
import type { CardStudent } from '@/types/cards';

// QR agrandi pour rester lisible/scannable une fois imprimé — on s'écarte
// volontairement du ratio strict CR80 (carte mobile) pour lui donner plus
// de place, à la demande explicite (impression + affichage plus gros).
export const CARD_WIDTH = 460;
export const CARD_HEIGHT = 210;

type StudentCardVisualProps = {
  student: CardStudent;
  /** Data URL déjà générée (voir lib/cards/qr.ts) — composant volontairement pur/synchrone pour être capturable de façon déterministe par html2canvas. */
  qrDataUrl: string | null;
};

export const StudentCardVisual = forwardRef<HTMLDivElement, StudentCardVisualProps>(function StudentCardVisual(
  { student, qrDataUrl },
  ref,
) {
  const fullName = [student.lastName, student.middleName, student.firstName].filter(Boolean).join(' ');

  return (
    <div
      ref={ref}
      style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}
      className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-5"
    >
      {student.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={student.photoUrl}
          alt={fullName}
          crossOrigin="anonymous"
          className="h-32 w-28 flex-shrink-0 rounded-lg object-cover bg-zinc-100"
        />
      ) : (
        <div className="h-32 w-28 flex-shrink-0 rounded-lg bg-zinc-100" />
      )}

      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-zinc-900 leading-tight">{fullName}</p>
        <p className="mt-1 text-xs text-zinc-500">
          {student.schoolClass.name} — {student.schoolClass.promotion}
        </p>
      </div>

      <div className="flex h-40 w-40 flex-shrink-0 items-center justify-center">
        {qrDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qrDataUrl} alt="QR code élève" className="h-full w-full" />
        ) : (
          <span className="text-center text-[10px] text-zinc-400">Aucune carte</span>
        )}
      </div>
    </div>
  );
});
