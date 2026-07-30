'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { CredentialsBanner } from '@/components/ui/credentials-banner';
import { TableRowsSkeleton } from '@/components/ui/skeleton';
import { getErrorMessage } from '@/lib/api/errors';
import { useCreateStaff, useDisableStaff, useStaff } from '@/lib/hooks/useStaff';

const staffSchema = z.object({
  role: z.enum(['ENSEIGNANT', 'SURVEILLANT', 'DIRECTION']),
  firstName: z.string().min(1, 'Prénom requis'),
  lastName: z.string().min(1, 'Nom requis'),
});
type StaffForm = z.infer<typeof staffSchema>;

const ROLE_LABELS: Record<StaffForm['role'], string> = {
  ENSEIGNANT: 'Enseignant',
  SURVEILLANT: 'Surveillant',
  DIRECTION: 'Direction',
};

export default function PersonnelPage() {
  const staff = useStaff();
  const createStaff = useCreateStaff();
  const disableStaff = useDisableStaff();
  const [createdCredentials, setCreatedCredentials] = useState<{ username: string; password: string } | null>(null);
  const [disableTarget, setDisableTarget] = useState<{ id: string; username: string } | null>(null);
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
        <CredentialsBanner
          label="Compte créé"
          username={createdCredentials.username}
          password={createdCredentials.password}
          onDismiss={() => setCreatedCredentials(null)}
        />
      )}

      {createStaff.isError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          {getErrorMessage(createStaff.error, 'Impossible de créer ce compte. Vérifie les champs et réessaie.')}
        </div>
      )}

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-wrap gap-3 items-end"
      >
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-500">Rôle</label>
          <select {...register('role')} className="rounded-lg border border-zinc-200 px-3 py-2 text-sm">
            <option value="ENSEIGNANT">Enseignant</option>
            <option value="SURVEILLANT">Surveillant</option>
            <option value="DIRECTION">Direction</option>
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
        <button
          type="submit"
          disabled={createStaff.isPending}
          className="rounded-lg bg-zinc-900 text-white text-sm font-medium px-4 py-2 hover:bg-zinc-800 disabled:opacity-50"
        >
          {createStaff.isPending ? 'Création…' : 'Créer le compte'}
        </button>
      </form>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs font-medium text-zinc-500">
              <th className="p-3">Identifiant</th>
              <th className="p-3">Rôle</th>
              <th className="p-3">Statut</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {staff.isLoading && <TableRowsSkeleton rows={4} cols={4} />}
            {!staff.isLoading &&
              (staff.data ?? []).map((account) => (
                <tr key={account.id}>
                  <td className="p-3 font-semibold text-zinc-900">{account.username}</td>
                  <td className="p-3 text-zinc-500">{ROLE_LABELS[account.role]}</td>
                  <td className="p-3">
                    {account.disabledAt ? (
                      <span className="inline-block rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500">
                        Désactivé
                      </span>
                    ) : (
                      <span className="inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600">
                        Actif
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    {!account.disabledAt && (
                      <button
                        type="button"
                        onClick={() => setDisableTarget({ id: account.id, username: account.username })}
                        className="text-xs font-medium text-red-600 hover:text-red-700"
                      >
                        Désactiver
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            {!staff.isLoading && staff.data?.length === 0 && (
              <tr>
                <td colSpan={4} className="p-4 text-sm text-zinc-400">
                  Aucun compte.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={disableTarget !== null}
        tone="danger"
        title="Désactiver ce compte ?"
        description={`${disableTarget?.username} ne pourra plus se connecter tant que le compte n'est pas réactivé.`}
        confirmLabel="Désactiver"
        isLoading={disableStaff.isPending}
        onCancel={() => setDisableTarget(null)}
        onConfirm={() => {
          if (disableTarget) disableStaff.mutate(disableTarget.id, { onSuccess: () => setDisableTarget(null) });
        }}
      />
    </div>
  );
}
