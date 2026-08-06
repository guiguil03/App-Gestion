'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { AxiosError } from 'axios';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { authApi } from '@/lib/api/auth';
import { useAuth } from '@/providers/auth-provider';

const emailSchema = z.object({ email: z.string().email('Adresse email invalide') });
type EmailForm = z.infer<typeof emailSchema>;

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Mot de passe actuel requis'),
    newPassword: z.string().min(8, 'Le nouveau mot de passe doit contenir au moins 8 caractères'),
    confirmPassword: z.string().min(1, 'Confirmation requise'),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: 'Les deux mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  });

type PasswordForm = z.infer<typeof passwordSchema>;

export default function ProfilPage() {
  const { session } = useAuth();
  const [saved, setSaved] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) });

  const [emailSaved, setEmailSaved] = useState(false);
  const [emailServerError, setEmailServerError] = useState<string | null>(null);
  const {
    register: registerEmail,
    handleSubmit: handleSubmitEmail,
    formState: { errors: emailErrors, isSubmitting: isSubmittingEmail },
  } = useForm<EmailForm>({ resolver: zodResolver(emailSchema) });

  async function onSubmit(values: PasswordForm) {
    setSaved(false);
    setServerError(null);
    try {
      await authApi.changePassword(values.currentPassword, values.newPassword);
      reset();
      setSaved(true);
    } catch (err) {
      const message =
        err instanceof AxiosError && err.response?.data?.message
          ? err.response.data.message
          : 'Impossible de changer le mot de passe.';
      setServerError(message);
    }
  }

  async function onSubmitEmail(values: EmailForm) {
    setEmailSaved(false);
    setEmailServerError(null);
    try {
      await authApi.updateNotificationEmail(values.email);
      setEmailSaved(true);
    } catch (err) {
      const message =
        err instanceof AxiosError && err.response?.data?.message
          ? err.response.data.message
          : "Impossible d'enregistrer l'email.";
      setEmailServerError(message);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-zinc-900">Profil</h1>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 max-w-sm">
        <p className="text-sm text-zinc-500">Identifiant</p>
        <p className="text-sm font-semibold text-zinc-900">{session?.username}</p>
      </div>

      <form
        onSubmit={handleSubmitEmail(onSubmitEmail)}
        className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 max-w-sm space-y-4"
      >
        <div>
          <h2 className="text-sm font-semibold text-zinc-700">Rapport hebdomadaire par email</h2>
          <p className="text-xs text-zinc-500 mt-1">
            Renseigne une adresse pour recevoir chaque lundi un résumé de présence de la semaine écoulée, sans avoir à
            te connecter.
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-500">Adresse email</label>
          <input
            type="email"
            placeholder="direction@ecole.example"
            {...registerEmail('email')}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          />
          {emailErrors.email && <p className="text-xs text-red-600">{emailErrors.email.message}</p>}
        </div>

        {emailServerError && <p className="text-sm text-red-600">{emailServerError}</p>}
        {emailSaved && !emailServerError && <p className="text-sm text-emerald-600">Email enregistré.</p>}

        <button
          type="submit"
          disabled={isSubmittingEmail}
          className="rounded-lg bg-zinc-900 text-white text-sm font-medium px-4 py-2 hover:bg-zinc-800 disabled:opacity-50"
        >
          {isSubmittingEmail ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </form>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 max-w-sm space-y-4"
      >
        <div>
          <h2 className="text-sm font-semibold text-zinc-700">Changer le mot de passe</h2>
          <p className="text-xs text-zinc-500 mt-1">
            Choisis un mot de passe facile à retenir pour toi — il remplace celui généré automatiquement.
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-500">Mot de passe actuel</label>
          <input
            type="password"
            {...register('currentPassword')}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          />
          {errors.currentPassword && <p className="text-xs text-red-600">{errors.currentPassword.message}</p>}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-500">Nouveau mot de passe</label>
          <input
            type="password"
            {...register('newPassword')}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          />
          {errors.newPassword && <p className="text-xs text-red-600">{errors.newPassword.message}</p>}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-500">Confirmer le nouveau mot de passe</label>
          <input
            type="password"
            {...register('confirmPassword')}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          />
          {errors.confirmPassword && <p className="text-xs text-red-600">{errors.confirmPassword.message}</p>}
        </div>

        {serverError && <p className="text-sm text-red-600">{serverError}</p>}
        {saved && !serverError && <p className="text-sm text-emerald-600">Mot de passe mis à jour.</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-zinc-900 text-white text-sm font-medium px-4 py-2 hover:bg-zinc-800 disabled:opacity-50"
        >
          {isSubmitting ? 'Enregistrement...' : 'Mettre à jour'}
        </button>
      </form>
    </div>
  );
}
