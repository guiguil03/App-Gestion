'use client';

import { useState } from 'react';
import { CheckCircle2, Clock, FileText, Users, XCircle } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { TooltipProps } from 'recharts';
import type { ClassComparison } from '@/types/dashboard';
import { KpiCard, KpiCardSkeleton } from '@/components/ui/kpi-card';
import { cn } from '@/lib/utils';
import { useAlerts, useClassesComparison, useOverview, useTrend } from '@/lib/hooks/useDashboard';
import { useSchoolProfile } from '@/lib/hooks/useSchool';
import { useDashboardStream } from '@/lib/realtime/useDashboardStream';
import { exportEscalationLetterPdf } from '@/lib/reports/export';
import { QuickRollCall } from './_components/quick-roll-call';

const TREND_PERIODS = [
  { value: 'week', label: '7 derniers jours' },
  { value: 'month', label: '30 derniers jours' },
] as const;

type TrendPeriod = (typeof TREND_PERIODS)[number]['value'];

function ClassComparisonTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload as ClassComparison;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm">
      <p className="font-medium text-zinc-700">{point.name}</p>
      <p className="text-zinc-500">
        {point.presentCount}/{point.totalStudents} présents ({point.rate}%)
      </p>
    </div>
  );
}

export default function DashboardOverviewPage() {
  const status = useDashboardStream();
  const overview = useOverview();
  const [trendPeriod, setTrendPeriod] = useState<TrendPeriod>('week');
  const trend = useTrend(trendPeriod);
  const classes = useClassesComparison();
  const alerts = useAlerts();
  const school = useSchoolProfile();

  function handleGenerateLatenessLetter(s: { firstName: string; lastName: string; lateCount: number }) {
    exportEscalationLetterPdf(
      {
        schoolName: school.data?.name ?? '',
        studentFullName: `${s.firstName} ${s.lastName}`,
        schoolClassName: '',
        reason: 'retards',
        detail: `${s.lateCount} retard${s.lateCount > 1 ? 's' : ''} sur les 30 derniers jours`,
      },
      `courrier-retards-${s.lastName}.pdf`,
    );
  }

  function handleGenerateAbsenceLetter(s: {
    studentName: string;
    schoolClassName: string;
    consecutiveAbsences: number;
  }) {
    exportEscalationLetterPdf(
      {
        schoolName: school.data?.name ?? '',
        studentFullName: s.studentName,
        schoolClassName: s.schoolClassName,
        reason: 'absences',
        detail: `${s.consecutiveAbsences} jour${s.consecutiveAbsences > 1 ? 's' : ''} d'absence consécutifs`,
      },
      `courrier-absences-${s.studentName.replace(/\s+/g, '-')}.pdf`,
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-zinc-900">Vue d&apos;ensemble</h1>
        <span
          className={`text-xs font-medium px-2 py-1 rounded-full ${
            status === 'live' ? 'bg-emerald-50 text-emerald-600' : 'bg-zinc-100 text-zinc-500'
          }`}
        >
          {status === 'live' ? 'Temps réel actif' : status === 'connecting' ? 'Connexion...' : 'Hors ligne'}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {overview.isLoading ? (
          <>
            <KpiCardSkeleton />
            <KpiCardSkeleton />
            <KpiCardSkeleton />
            <KpiCardSkeleton />
          </>
        ) : (
          <>
            <KpiCard label="Élèves inscrits" value={overview.data?.totalStudents ?? 0} icon={Users} tone="blue" />
            <KpiCard label="Présents" value={overview.data?.presentCount ?? 0} icon={CheckCircle2} tone="emerald" />
            <KpiCard label="En retard" value={overview.data?.lateCount ?? 0} icon={Clock} tone="amber" />
            <KpiCard label="Absents" value={overview.data?.absentCount ?? 0} icon={XCircle} tone="red" />
          </>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-zinc-700">
            Taux de présence — {TREND_PERIODS.find((p) => p.value === trendPeriod)?.label}
          </h2>
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5">
            {TREND_PERIODS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setTrendPeriod(p.value)}
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                  trendPeriod === p.value ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-900',
                )}
              >
                {p.value === 'week' ? 'Semaine' : 'Mois'}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={trend.data ?? []}>
            <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={trendPeriod === 'month' ? 4 : 0} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Line type="monotone" dataKey="rate" stroke="#10b981" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <QuickRollCall />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-zinc-700 mb-4">Comparaison des classes</h2>
          {classes.data?.length === 0 ? (
            <p className="text-sm text-zinc-400">Aucune classe.</p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(120, (classes.data ?? []).length * 36)}>
              <BarChart
                data={[...(classes.data ?? [])].sort((a, b) => b.rate - a.rate)}
                layout="vertical"
                margin={{ left: 8, right: 24, top: 4, bottom: 4 }}
              >
                <CartesianGrid horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} />
                <Tooltip content={<ClassComparisonTooltip />} cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="rate" fill="#10b981" radius={[0, 4, 4, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-zinc-700 mb-4">Alertes</h2>
          <div className="space-y-3">
            <div>
              <p className="text-xs font-medium text-zinc-500 mb-1">Absences non justifiées</p>
              {(alerts.data?.unjustifiedAbsences ?? []).slice(0, 5).map((a) => (
                <p key={a.absenceId} className="text-sm text-zinc-700">
                  {a.firstName} {a.lastName} — {a.date}
                </p>
              ))}
              {alerts.data?.unjustifiedAbsences.length === 0 && <p className="text-sm text-zinc-400">Aucune.</p>}
            </div>
            <div>
              <p className="text-xs font-medium text-zinc-500 mb-1">Retards répétés</p>
              {(alerts.data?.repeatedLateness ?? []).slice(0, 5).map((s) => (
                <div key={s.studentId} className="flex items-center justify-between gap-2 text-sm text-zinc-700">
                  <span>
                    {s.firstName} {s.lastName} — {s.lateCount} retards
                  </span>
                  <button
                    type="button"
                    onClick={() => handleGenerateLatenessLetter(s)}
                    title="Générer un brouillon de courrier de convocation (PDF, à relire avant envoi)"
                    className="flex-shrink-0 rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                  >
                    <FileText size={13} />
                  </button>
                </div>
              ))}
              {alerts.data?.repeatedLateness.length === 0 && <p className="text-sm text-zinc-400">Aucun.</p>}
            </div>
            <div>
              <p className="text-xs font-medium text-zinc-500 mb-1">Absences consécutives</p>
              {(alerts.data?.consecutiveAbsences ?? []).slice(0, 5).map((s) => (
                <div key={s.studentId} className="flex items-center justify-between gap-2 text-sm text-zinc-700">
                  <span>
                    {s.studentName} ({s.schoolClassName}) — {s.consecutiveAbsences} jours d&apos;affilée
                  </span>
                  <button
                    type="button"
                    onClick={() => handleGenerateAbsenceLetter(s)}
                    title="Générer un brouillon de courrier de convocation (PDF, à relire avant envoi)"
                    className="flex-shrink-0 rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                  >
                    <FileText size={13} />
                  </button>
                </div>
              ))}
              {alerts.data?.consecutiveAbsences.length === 0 && <p className="text-sm text-zinc-400">Aucune.</p>}
            </div>
            <div>
              <p className="text-xs font-medium text-zinc-500 mb-1">
                Notifications non délivrées (7 derniers jours)
              </p>
              {(alerts.data?.failedNotifications ?? []).slice(0, 5).map((n) => (
                <p key={n.id} className="text-sm text-red-600">
                  {n.firstName} {n.lastName} — {n.channel === 'SMS' ? 'SMS' : 'Push'} échoué le{' '}
                  {new Date(n.createdAt).toLocaleDateString('fr-FR')}
                </p>
              ))}
              {alerts.data?.failedNotifications.length === 0 && <p className="text-sm text-zinc-400">Aucune.</p>}
              {(alerts.data?.failedNotifications.length ?? 0) > 3 && (
                <p className="text-xs text-red-500 mt-1">
                  Plusieurs échecs récents — vérifie la configuration SMS/push si ça persiste.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
