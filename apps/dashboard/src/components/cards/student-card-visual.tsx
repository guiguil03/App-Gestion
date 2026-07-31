'use client';

import { forwardRef } from 'react';
import { GraduationCap } from 'lucide-react';
import type { CardStudent } from '@/types/cards';

// QR agrandi pour rester lisible/scannable une fois imprimé — on s'écarte
// volontairement du ratio strict CR80 (carte mobile) pour lui donner plus
// de place, à la demande explicite (impression + affichage plus gros).
// Hauteur augmentée par rapport à la v1 (210px) pour accueillir le bandeau
// d'en-tête + les infos complémentaires (naissance, sexe, n° de carte).
export const CARD_WIDTH = 460;
export const CARD_HEIGHT = 264;

type StudentCardVisualProps = {
  student: CardStudent;
  /** Data URL déjà générée (voir lib/cards/qr.ts) — composant volontairement pur/synchrone pour être capturable de façon déterministe par html2canvas. */
  qrDataUrl: string | null;
  /** Carte active associée — absente si aucune carte n'a encore été émise (composant reste affichable, juste sans zone QR/pied de carte remplis). */
  cardId?: string | null;
  issuedAt?: string | null;
};

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('fr-FR');
}

export const StudentCardVisual = forwardRef<HTMLDivElement, StudentCardVisualProps>(function StudentCardVisual(
  { student, qrDataUrl, cardId, issuedAt },
  ref,
) {
  const fullName = [student.lastName, student.middleName, student.firstName].filter(Boolean).join(' ');
  const cardNumber = cardId ? cardId.replace(/-/g, '').slice(0, 8).toUpperCase() : null;

  return (
    <div
      ref={ref}
      style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}
      className="flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm"
    >
      {/* Bandeau d'en-tête — identité visuelle de l'établissement */}
      <div className="flex flex-shrink-0 items-center justify-between bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md bg-white/15">
            <GraduationCap size={14} className="text-white" />
          </div>
          <div className="leading-none">
            <p className="text-[8px] font-bold uppercase tracking-widest text-white/80">PrésenceConnect</p>
            <p className="mt-0.5 text-xs font-bold text-white">Carte élève</p>
          </div>
        </div>
        {cardNumber && (
          <p className="font-mono text-[9px] font-semibold tracking-wide text-white/85">N° {cardNumber}</p>
        )}
      </div>

      {/* Corps — photo, identité, informations, QR */}
      <div className="flex flex-1 items-stretch gap-3.5 px-4 py-3">
        {student.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={student.photoUrl}
            alt={fullName}
            crossOrigin="anonymous"
            className="h-[104px] w-[84px] flex-shrink-0 rounded-lg bg-zinc-100 object-cover ring-2 ring-emerald-100"
          />
        ) : (
          <div className="flex h-[104px] w-[84px] flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-50 to-teal-50 text-xl font-bold text-emerald-600 ring-2 ring-emerald-100">
            {fullName.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold leading-tight text-zinc-900">{fullName}</p>
          <span className="mt-1 inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
            {student.schoolClass.name} · {student.schoolClass.promotion}
          </span>

          <div className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-zinc-100 pt-2.5">
            <div>
              <p className="text-[8px] font-semibold uppercase tracking-wide text-zinc-400">Né(e) le</p>
              <p className="text-[11px] font-medium text-zinc-700">{formatDate(student.dateOfBirth)}</p>
            </div>
            <div>
              <p className="text-[8px] font-semibold uppercase tracking-wide text-zinc-400">Sexe</p>
              <p className="text-[11px] font-medium text-zinc-700">{student.sex === 'M' ? 'Masculin' : 'Féminin'}</p>
            </div>
          </div>
        </div>

        <div className="flex w-[104px] flex-shrink-0 flex-col items-center justify-center gap-1">
          <div className="flex h-[92px] w-[92px] items-center justify-center rounded-lg border border-zinc-200 bg-white p-1 shadow-sm">
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrDataUrl} alt="QR code élève" className="h-full w-full" />
            ) : (
              <span className="px-1 text-center text-[8px] leading-tight text-zinc-400">Aucune carte émise</span>
            )}
          </div>
          <p className="text-center text-[7px] uppercase tracking-wide text-zinc-400">Scanner au portail</p>
        </div>
      </div>

      {/* Pied de carte */}
      <div className="flex flex-shrink-0 items-center justify-between border-t border-zinc-100 bg-zinc-50 px-4 py-1.5">
        <p className="text-[8px] text-zinc-400">{issuedAt ? `Émise le ${formatDate(issuedAt)}` : 'Carte non émise'}</p>
        <p className="text-[8px] tracking-wide text-zinc-300">presenceconnect.app</p>
      </div>
    </div>
  );
});
