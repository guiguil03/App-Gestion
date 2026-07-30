'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, CheckCircle2, LogOut, School as SchoolIcon, Users } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { CredentialsBanner } from '@/components/ui/credentials-banner';
import { KpiCard } from '@/components/ui/kpi-card';
import { SearchInput } from '@/components/ui/search-input';
import { Skeleton } from '@/components/ui/skeleton';
import { adminApi } from '@/lib/api/admin';
import { getErrorMessage } from '@/lib/api/errors';
import { useAdminSchools, useCreateSchool } from '@/lib/hooks/useAdminSchools';
import { useAuth } from '@/providers/auth-provider';
import type { AdminSchool } from '@/types/admin';

const schoolSchema = z.object({ name: z.string().min(1, 'Nom requis') });
type SchoolForm = z.infer<typeof schoolSchema>;

function initialsFor(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return ((words[0]?.[0] ?? '') + (words[1]?.[0] ?? '')).toUpperCase() || '?';
}

export default function AdminPage() {
  const router = useRouter();
  const { session, logout } = useAuth();
  const schools = useAdminSchools();
  const createSchool = useCreateSchool();
  const [credentials, setCredentials] = useState<{ schoolName: string; username: string; password: string } | null>(null);
  const [search, setSearch] = useState('');
  const [enteringId, setEnteringId] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SchoolForm>({ resolver: zodResolver(schoolSchema) });

  const filteredSchools = useMemo(() => {
    const all = schools.data ?? [];
    const term = search.trim().toLowerCase();
    return term ? all.filter((s) => s.name.toLowerCase().includes(term)) : all;
  }, [schools.data, search]);

  const totals = useMemo(() => {
    const all = schools.data ?? [];
    const totalStudents = all.reduce((sum, s) => sum + s.studentCount, 0);
    const totalPresent = all.reduce((sum, s) => sum + s.presentToday, 0);
    const avgRate = totalStudents === 0 ? 0 : Math.round((totalPresent / totalStudents) * 100);
    return { schoolCount: all.length, totalStudents, avgRate };
  }, [schools.data]);

  async function onSubmit(values: SchoolForm) {
    const result = await createSchool.mutateAsync(values.name);
    setCredentials({
      schoolName: result.school.name,
      username: result.directionAccount.username,
      password: result.directionAccount.password,
    });
    reset();
  }

  async function handleEnter(schoolId: string) {
    setEnteringId(schoolId);
    await adminApi.selectSchool(schoolId);
    router.push('/dashboard');
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-zinc-100 px-4 sm:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm shadow-emerald-200 flex-shrink-0">
            <span className="text-xs font-bold text-white tracking-tight">PS</span>
          </div>
          <div>
            <h1 className="text-base font-bold text-zinc-900 leading-tight">Super Admin — Écoles</h1>
            <p className="text-xs text-zinc-500">{session?.username}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void logout()}
          className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-red-600"
        >
          <LogOut size={14} />
          <span className="hidden sm:inline">Déconnexion</span>
        </button>
      </header>

      <main className="max-w-5xl mx-auto p-4 sm:p-8 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KpiCard label="Écoles" value={totals.schoolCount} icon={SchoolIcon} tone="blue" />
          <KpiCard label="Élèves au total" value={totals.totalStudents} icon={Users} tone="emerald" />
          <KpiCard label="Taux de présence moyen" value={`${totals.avgRate}%`} icon={CheckCircle2} tone="amber" />
        </div>

        {credentials && (
          <CredentialsBanner
            label={`École « ${credentials.schoolName} » créée — compte direction`}
            username={credentials.username}
            password={credentials.password}
            onDismiss={() => setCredentials(null)}
          />
        )}

        {createSchool.isError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
            {getErrorMessage(createSchool.error, "Impossible de créer l'école. Vérifie le nom et réessaie.")}
          </div>
        )}

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col sm:flex-row gap-3 sm:items-end"
        >
          <div className="flex-1 space-y-1.5">
            <label className="text-xs font-medium text-zinc-500">Nom de la nouvelle école</label>
            <input {...register('name')} className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm" />
            {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
          </div>
          <button
            type="submit"
            disabled={createSchool.isPending}
            className="rounded-lg bg-zinc-900 text-white text-sm font-medium px-4 py-2 hover:bg-zinc-800 disabled:opacity-50"
          >
            {createSchool.isPending ? 'Création...' : "Créer l'école"}
          </button>
        </form>

        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-zinc-700">Toutes les écoles ({filteredSchools.length})</h2>
          <SearchInput value={search} onChange={setSearch} placeholder="Rechercher une école…" />
        </div>

        {schools.isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-xl" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </div>
                <Skeleton className="h-1.5 w-full rounded-full" />
                <Skeleton className="h-8 w-full rounded-lg" />
              </div>
            ))}
          </div>
        )}

        {!schools.isLoading && filteredSchools.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSchools.map((school) => (
              <SchoolCard
                key={school.id}
                school={school}
                isEntering={enteringId === school.id}
                onEnter={() => void handleEnter(school.id)}
              />
            ))}
          </div>
        )}

        {!schools.isLoading && filteredSchools.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-10 flex flex-col items-center text-center gap-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-50 text-zinc-400">
              <SchoolIcon size={20} />
            </div>
            <p className="text-sm font-medium text-zinc-700">
              {search ? 'Aucune école ne correspond à ta recherche.' : 'Aucune école pour le moment.'}
            </p>
            {!search && <p className="text-xs text-zinc-400">Crée la première école avec le formulaire ci-dessus.</p>}
          </div>
        )}
      </main>
    </div>
  );
}

function SchoolCard({
  school,
  isEntering,
  onEnter,
}: {
  school: AdminSchool;
  isEntering: boolean;
  onEnter: () => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col gap-4 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
          {initialsFor(school.name)}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-zinc-900 truncate">{school.name}</p>
          <p className="text-xs text-zinc-500">{school.studentCount} élève{school.studentCount > 1 ? 's' : ''}</p>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between text-xs text-zinc-500 mb-1">
          <span>Présents aujourd&apos;hui</span>
          <span className="font-medium text-zinc-700 tabular-nums">
            {school.presentToday}/{school.studentCount} ({school.rate}%)
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${Math.min(100, Math.max(0, school.rate))}%` }}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={onEnter}
        disabled={isEntering}
        className="mt-auto w-full rounded-lg border border-zinc-200 text-sm font-medium py-2 text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 flex items-center justify-center gap-1.5"
      >
        {isEntering ? 'Ouverture…' : 'Entrer'}
        {!isEntering && <ArrowRight size={14} />}
      </button>
    </div>
  );
}
