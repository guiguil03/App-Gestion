'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { LogOut } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { adminApi } from '@/lib/api/admin';
import { useAdminSchools, useCreateSchool } from '@/lib/hooks/useAdminSchools';
import { useAuth } from '@/providers/auth-provider';

const schoolSchema = z.object({ name: z.string().min(1, 'Nom requis') });
type SchoolForm = z.infer<typeof schoolSchema>;

export default function AdminPage() {
  const router = useRouter();
  const { session, logout } = useAuth();
  const schools = useAdminSchools();
  const createSchool = useCreateSchool();
  const [credentials, setCredentials] = useState<{ schoolName: string; username: string; password: string } | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SchoolForm>({ resolver: zodResolver(schoolSchema) });

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
    await adminApi.selectSchool(schoolId);
    router.push('/dashboard');
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-zinc-100 px-8 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-zinc-900">Super Admin — Écoles</h1>
          <p className="text-xs text-zinc-500">{session?.username}</p>
        </div>
        <button
          type="button"
          onClick={() => void logout()}
          className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-red-600"
        >
          <LogOut size={14} />
          Déconnexion
        </button>
      </header>

      <main className="max-w-4xl mx-auto p-8 space-y-6">
        {credentials && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-800">
            École <strong>{credentials.schoolName}</strong> créée — compte direction : identifiant{' '}
            <strong>{credentials.username}</strong>, mot de passe <strong>{credentials.password}</strong>. Note-le
            maintenant : il ne sera plus jamais affiché.
          </div>
        )}

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex gap-3 items-end"
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

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100">
          {(schools.data ?? []).map((school) => (
            <div key={school.id} className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-zinc-900">{school.name}</p>
                <p className="text-xs text-zinc-500">
                  {school.studentCount} élèves · {school.presentToday} présents aujourd&apos;hui ({school.rate}%)
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleEnter(school.id)}
                className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
              >
                Entrer →
              </button>
            </div>
          ))}
          {schools.data?.length === 0 && <p className="p-4 text-sm text-zinc-400">Aucune école.</p>}
        </div>
      </main>
    </div>
  );
}
