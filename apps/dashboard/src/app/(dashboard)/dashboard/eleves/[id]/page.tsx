'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { StudentCardVisual } from '@/components/cards/student-card-visual';
import { useCardPrint } from '@/lib/cards/useCardPrint';
import { useQrDataUrl } from '@/lib/cards/useQrDataUrl';
import { useStudentAbsences, useJustifyAbsence } from '@/lib/hooks/useAbsences';
import { useCards, useIssueCard, useRevokeCard } from '@/lib/hooks/useCards';
import { useProvisionParentAccount, useProvisionStudentAccount, useStudent } from '@/lib/hooks/useStudents';

type ProvisionedCredentials = { label: string; username: string; password: string | null };

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const student = useStudent(id ?? null);
  const cards = useCards();
  const absences = useStudentAbsences(id ?? null);
  const issueCard = useIssueCard();
  const revokeCard = useRevokeCard();
  const provisionStudentAccount = useProvisionStudentAccount();
  const provisionParentAccount = useProvisionParentAccount();
  const justifyAbsence = useJustifyAbsence();
  const cardPrint = useCardPrint();
  const [credentials, setCredentials] = useState<ProvisionedCredentials | null>(null);
  const [reasonDrafts, setReasonDrafts] = useState<Record<string, string>>({});

  const cardStatus = (cards.data ?? []).find((c) => c.student.id === id) ?? null;
  const qrDataUrl = useQrDataUrl(cardStatus?.activeCard?.qrCode ?? null);

  if (student.isLoading || !student.data) {
    return (
      <div className="space-y-6">
        <BackLink />
      </div>
    );
  }

  const s = student.data;
  const fullName = [s.lastName, s.middleName, s.firstName].filter(Boolean).join(' ');

  async function handleProvisionStudent() {
    const result = await provisionStudentAccount.mutateAsync(s.id);
    setCredentials({ label: `Compte élève — ${fullName}`, username: result.username, password: result.password });
  }

  async function handleProvisionParent(parentGuardianId: string, parentFullName: string) {
    const result = await provisionParentAccount.mutateAsync({ studentId: s.id, parentGuardianId });
    setCredentials({
      label: result.reused ? `Compte parent existant réutilisé — ${parentFullName}` : `Compte parent — ${parentFullName}`,
      username: result.username,
      password: result.password,
    });
  }

  return (
    <div className="space-y-6">
      {cardPrint.portal}
      <BackLink />

      <div className="flex items-center gap-4">
        {s.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={s.photoUrl} alt={fullName} className="w-16 h-16 rounded-full object-cover" />
        ) : (
          <div className="w-16 h-16 rounded-full bg-zinc-100 text-zinc-400 flex items-center justify-center text-xl font-semibold">
            {fullName.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <h1 className="text-xl font-bold text-zinc-900">{fullName}</h1>
          <p className="text-sm text-zinc-500">
            {s.schoolClass.name} · {s.schoolClass.promotion}
          </p>
        </div>
      </div>

      {credentials && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-800">
          {credentials.label} — identifiant <strong>{credentials.username}</strong>
          {credentials.password ? (
            <>
              , mot de passe <strong>{credentials.password}</strong>. Note-le maintenant : il ne sera plus jamais
              affiché.
            </>
          ) : (
            ' (compte déjà existant, mot de passe non récupérable — utilise une régénération si besoin).'
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-semibold text-zinc-700">Informations</h2>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs text-zinc-500">Sexe</dt>
              <dd className="text-zinc-900">{s.sex === 'M' ? 'Masculin' : 'Féminin'}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">Date de naissance</dt>
              <dd className="text-zinc-900">{s.dateOfBirth}</dd>
            </div>
          </dl>

          <button
            type="button"
            onClick={() => void handleProvisionStudent()}
            disabled={provisionStudentAccount.isPending}
            className="text-xs font-medium text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
          >
            Provisionner compte élève
          </button>

          <div className="border-t border-zinc-100 pt-3">
            <p className="text-xs font-semibold text-zinc-500 mb-2">Parents / tuteurs</p>
            {s.parents.length === 0 && <p className="text-xs text-zinc-400">Aucun parent renseigné.</p>}
            <div className="space-y-2">
              {s.parents.map((parent) => (
                <div key={parent.id} className="flex items-center justify-between gap-2 text-xs text-zinc-600">
                  <span>
                    {parent.fullName} ({parent.relationship}) — {parent.phoneNumber}
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleProvisionParent(parent.id, parent.fullName)}
                    disabled={provisionParentAccount.isPending}
                    className="text-emerald-600 hover:text-emerald-700 font-medium whitespace-nowrap disabled:opacity-50"
                  >
                    Provisionner compte parent
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-semibold text-zinc-700">Carte élève</h2>
          <div className="flex justify-center">
            <StudentCardVisual student={s} qrDataUrl={cardStatus?.activeCard ? qrDataUrl : null} />
          </div>

          {cardStatus?.activeCard ? (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={cardPrint.busy}
                onClick={() => void cardPrint.print([{ student: s, qrValue: cardStatus.activeCard!.qrCode }])}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
              >
                Imprimer
              </button>
              <button
                type="button"
                disabled={cardPrint.busy}
                onClick={() =>
                  void cardPrint.downloadPdf([{ student: s, qrValue: cardStatus.activeCard!.qrCode }], `carte-${s.lastName}.pdf`)
                }
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
              >
                Télécharger PDF
              </button>
              <button
                type="button"
                disabled={issueCard.isPending}
                onClick={() => issueCard.mutate(s.id)}
                className="col-span-2 rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
              >
                Perte/vol — réémettre une nouvelle carte
              </button>
              <button
                type="button"
                disabled={revokeCard.isPending}
                onClick={() => revokeCard.mutate(cardStatus.activeCard!.id)}
                className="col-span-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                Révoquer cette carte
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={issueCard.isPending}
              onClick={() => issueCard.mutate(s.id)}
              className="w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              Émettre la carte
            </button>
          )}

          {cardStatus && cardStatus.history.length > 0 && (
            <div className="border-t border-zinc-100 pt-3 space-y-1">
              <p className="text-xs font-semibold text-zinc-500">Historique</p>
              {cardStatus.history.map((entry) => (
                <p key={entry.id} className="text-xs text-zinc-500">
                  Émise le {new Date(entry.issuedAt).toLocaleDateString('fr-FR')} — révoquée le{' '}
                  {new Date(entry.revokedAt).toLocaleDateString('fr-FR')}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <h2 className="text-sm font-semibold text-zinc-700 p-5 pb-0">Absences</h2>
        <div className="divide-y divide-slate-100 mt-3">
          {(absences.data ?? []).map((absence) => (
            <div key={absence.id} className="p-4 flex items-center justify-between gap-4">
              <p className="text-sm text-zinc-700">
                {absence.date}
                {absence.justified ? ` — justifiée (${absence.justificationReason})` : ' — non justifiée'}
              </p>
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
                    onClick={() => justifyAbsence.mutate({ id: absence.id, reason: reasonDrafts[absence.id] ?? '' })}
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
    </div>
  );
}

function BackLink() {
  return (
    <Link href="/dashboard/eleves" className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900">
      <ArrowLeft size={14} />
      Retour aux élèves
    </Link>
  );
}
