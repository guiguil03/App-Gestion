'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useCreateStaff, useDisableStaff, useStaff } from '@/lib/hooks/useStaff';

const staffSchema = z.object({
  role: z.enum(['ENSEIGNANT', 'SURVEILLANT']),
  firstName: z.string().min(1, 'Prénom requis'),
  lastName: z.string().min(1, 'Nom requis'),
});
type StaffForm = z.infer<typeof staffSchema>;

export default function PersonnelPage() {
  const staff = useStaff();
  const createStaff = useCreateStaff();
  const disableStaff = useDisableStaff();
  const [createdCredentials, setCreatedCredentials] = useState<{ username: string; password: string } | null>(null);
  const { register, handleSubmit, reset } = useForm<StaffForm>({
    resolver: zodResolver(staffSchema),
    defaultValues: { role: 'ENSEIGNANT' },
  });

  async function onSubmit(values: StaffForm) {
    const result = await createStaff.mutateAsync(values);
    setCreatedCredentials(result);
    reset();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-zinc-900">Personnel</h1>

      {createdCredentials && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-800">
          Compte créé — identifiant <strong>{createdCredentials.username}</strong>, mot de passe{' '}
          <strong>{createdCredentials.password}</strong>. Note-le maintenant : il ne sera plus jamais affiché.
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex gap-3 items-end">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-500">Rôle</label>
          <select {...register('role')} className="rounded-lg border border-zinc-200 px-3 py-2 text-sm">
            <option value="ENSEIGNANT">Enseignant</option>
            <option value="SURVEILLANT">Surveillant</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-500">Prénom</label>
          <input {...register('firstName')} className="rounded-lg border border-zinc-200 px-3 py-2 text-sm" />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-500">Nom</label>
          <input {...register('lastName')} className="rounded-lg border border-zinc-200 px-3 py-2 text-sm" />
        </div>
        <button type="submit" className="rounded-lg bg-zinc-900 text-white text-sm font-medium px-4 py-2 hover:bg-zinc-800">
          Créer le compte
        </button>
      </form>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100">
        {(staff.data ?? []).map((account) => (
          <div key={account.id} className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-zinc-900">{account.username}</p>
              <p className="text-xs text-zinc-500">
                {account.role === 'ENSEIGNANT' ? 'Enseignant' : 'Surveillant'}
                {account.disabledAt ? ' — désactivé' : ''}
              </p>
            </div>
            {!account.disabledAt && (
              <button
                type="button"
                onClick={() => disableStaff.mutate(account.id)}
                className="text-xs font-medium text-red-600 hover:text-red-700"
              >
                Désactiver
              </button>
            )}
          </div>
        ))}
        {staff.data?.length === 0 && <p className="p-4 text-sm text-zinc-400">Aucun compte.</p>}
      </div>
    </div>
  );
}
