'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Download, Plus, Trash2, X } from 'lucide-react';
import { StudentCardVisual } from '@/components/cards/student-card-visual';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { CredentialsBanner } from '@/components/ui/credentials-banner';
import { useCardPrint } from '@/lib/cards/useCardPrint';
import { useQrDataUrl } from '@/lib/cards/useQrDataUrl';
import { reportsApi } from '@/lib/api/reports';
import { exportStudentDossierExcel, exportStudentDossierPdf } from '@/lib/reports/export';
import { useStudentAbsences, useJustifyAbsence } from '@/lib/hooks/useAbsences';
import { useRecordManualAttendance } from '@/lib/hooks/useAttendance';
import { useCards, useIssueCard, useRevokeCard } from '@/lib/hooks/useCards';
import { useAttendanceHistory } from '@/lib/hooks/useReports';
import { useProvisionParentAccount, useProvisionStudentAccount, useRemoveStudent, useStudent } from '@/lib/hooks/useStudents';
import { AttendanceTrendChart } from './_components/attendance-trend-chart';

type ProvisionedCredentials = { label: string; username: string; password: string | null };

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function isoTime(date: Date): string {
  return date.toTimeString().slice(0, 5);
}

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const student = useStudent(id ?? null);
  const cards = useCards();
  const absences = useStudentAbsences(id ?? null);
  const attendanceHistory = useAttendanceHistory({
    studentId: id,
    startDate: isoDate(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)),
    endDate: isoDate(new Date()),
  });
  const issueCard = useIssueCard();
  const revokeCard = useRevokeCard();
  const provisionStudentAccount = useProvisionStudentAccount();
  const provisionParentAccount = useProvisionParentAccount();
  const removeStudent = useRemoveStudent();
  const justifyAbsence = useJustifyAbsence();
  const recordManualAttendance = useRecordManualAttendance();
  const cardPrint = useCardPrint();
  const [credentials, setCredentials] = useState<ProvisionedCredentials | null>(null);
  const [reasonDrafts, setReasonDrafts] = useState<Record<string, string>>({});
  const [revokeTarget, setRevokeTarget] = useState<string | null>(null);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [showManualAttendance, setShowManualAttendance] = useState(false);
  const [manualDate, setManualDate] = useState(() => isoDate(new Date()));
  const [manualTime, setManualTime] = useState(() => isoTime(new Date()));
  const [manualIsLate, setManualIsLate] = useState(false);

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

  async function handleRecordManualAttendance() {
    await recordManualAttendance.mutateAsync({
      studentId: s.id,
      input: { date: manualDate, time: manualTime, isLate: manualIsLate },
    });
    setShowManualAttendance(false);
    setManualIsLate(false);
  }

  async function handleRemoveStudent() {
    await removeStudent.mutateAsync(s.id);
    router.push('/dashboard/eleves');
  }

  async function handleExportDossier(format: 'pdf' | 'excel') {
    setIsExporting(true);
    setExportError(null);
    try {
      const entries = await reportsApi.attendanceHistory({
        studentId: s.id,
        startDate: '2000-01-01',
        endDate: isoDate(new Date()),
      });
      const safeName = fullName
        .normalize('NFD')
        .replace(/[^\x00-\x7F]/g, '')
        .replace(/[^a-zA-Z0-9]+/g, '-')
        .toLowerCase();
      if (format === 'pdf') {
        exportStudentDossierPdf(s, entries, `dossier-${safeName}.pdf`);
      } else {
        exportStudentDossierExcel(s, entries, `dossier-${safeName}.xlsx`);
      }
    } catch {
      setExportError('Impossible de générer le dossier. Réessaie.');
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      {cardPrint.portal}
      <BackLink />

      <div className="flex items-center justify-between gap-4">
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
        <div className="flex flex-shrink-0 items-center gap-2">
          <button
            type="button"
            disabled={isExporting}
            onClick={() => void handleExportDossier('pdf')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3.5 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            <Download size={14} /> Dossier PDF
          </button>
          <button
            type="button"
            disabled={isExporting}
            onClick={() => void handleExportDossier('excel')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3.5 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
          >
            <Download size={14} /> Dossier Excel
          </button>
          <button
            type="button"
            onClick={() => setShowRemoveConfirm(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3.5 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            <Trash2 size={14} /> Supprimer l&apos;élève
          </button>
        </div>
      </div>

      {exportError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">{exportError}</div>
      )}

      {credentials && (
        <CredentialsBanner
          label={credentials.label}
          username={credentials.username}
          password={credentials.password}
          onDismiss={() => setCredentials(null)}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
            <StudentCardVisual
              student={s}
              qrDataUrl={cardStatus?.activeCard ? qrDataUrl : null}
              cardId={cardStatus?.activeCard?.id}
              issuedAt={cardStatus?.activeCard?.issuedAt}
            />
          </div>

          {cardStatus?.activeCard ? (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={cardPrint.busy}
                onClick={() =>
                  void cardPrint.print([
                    {
                      student: s,
                      qrValue: cardStatus.activeCard!.qrCode,
                      cardId: cardStatus.activeCard!.id,
                      issuedAt: cardStatus.activeCard!.issuedAt,
                    },
                  ])
                }
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
              >
                Imprimer
              </button>
              <button
                type="button"
                disabled={cardPrint.busy}
                onClick={() =>
                  void cardPrint.downloadPdf(
                    [
                      {
                        student: s,
                        qrValue: cardStatus.activeCard!.qrCode,
                        cardId: cardStatus.activeCard!.id,
                        issuedAt: cardStatus.activeCard!.issuedAt,
                      },
                    ],
                    `carte-${s.lastName}.pdf`,
                  )
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
                onClick={() => setRevokeTarget(cardStatus.activeCard!.id)}
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

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-zinc-700 mb-4">Tendance de présence (12 dernières semaines)</h2>
        {attendanceHistory.isLoading ? (
          <p className="text-sm text-zinc-400">Chargement…</p>
        ) : (
          <AttendanceTrendChart entries={attendanceHistory.data ?? []} />
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between p-5 pb-0">
          <h2 className="text-sm font-semibold text-zinc-700">Absences</h2>
          <button
            type="button"
            onClick={() => setShowManualAttendance(true)}
            className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-700"
          >
            <Plus size={14} />
            Ajouter un pointage
          </button>
        </div>
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

      {showManualAttendance && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4"
          onClick={() => setShowManualAttendance(false)}
        >
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-zinc-900">Ajouter un pointage</h2>
              <button
                type="button"
                onClick={() => setShowManualAttendance(false)}
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-50 hover:text-zinc-900"
              >
                <X size={16} />
              </button>
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              À utiliser si le scan a été oublié côté mobile — enregistre la présence de {fullName} pour la date/heure
              choisie et annule l&apos;absence déjà détectée ce jour-là, s&apos;il y en a une.
            </p>

            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-500">Date</label>
                  <input
                    type="date"
                    value={manualDate}
                    onChange={(e) => setManualDate(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-500">Heure</label>
                  <input
                    type="time"
                    value={manualTime}
                    onChange={(e) => setManualTime(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-zinc-700">
                <input
                  type="checkbox"
                  checked={manualIsLate}
                  onChange={(e) => setManualIsLate(e.target.checked)}
                  className="h-4 w-4"
                />
                Marquer comme en retard
              </label>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowManualAttendance(false)}
                className="rounded-lg border border-zinc-200 px-3.5 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => void handleRecordManualAttendance()}
                disabled={recordManualAttendance.isPending}
                className="rounded-lg bg-zinc-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
              >
                {recordManualAttendance.isPending ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={revokeTarget !== null}
        tone="danger"
        title="Révoquer cette carte ?"
        description="L'ancien QR code sera immédiatement invalidé. L'élève ne pourra plus pointer avec tant qu'une nouvelle carte n'est pas émise."
        confirmLabel="Révoquer"
        isLoading={revokeCard.isPending}
        onCancel={() => setRevokeTarget(null)}
        onConfirm={() => {
          if (revokeTarget) revokeCard.mutate(revokeTarget, { onSuccess: () => setRevokeTarget(null) });
        }}
      />

      <ConfirmDialog
        open={showRemoveConfirm}
        tone="danger"
        title="Supprimer cet élève ?"
        description={`${fullName} sera retiré des listes et son compte de connexion (s'il existe) désactivé. L'historique de présence et les cartes déjà émises sont conservés.`}
        confirmLabel="Supprimer"
        isLoading={removeStudent.isPending}
        onCancel={() => setShowRemoveConfirm(false)}
        onConfirm={() => void handleRemoveStudent()}
      />
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
