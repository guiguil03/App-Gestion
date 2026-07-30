'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { AxiosError } from 'axios';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { AlertCircle, BellRing, Eye, EyeOff, Lock, Loader2, QrCode, User, WifiOff } from 'lucide-react';
import { useAuth } from '@/providers/auth-provider';

const loginSchema = z.object({
  username: z.string().min(1, 'Identifiant requis'),
  password: z.string().min(1, 'Mot de passe requis'),
});
type LoginForm = z.infer<typeof loginSchema>;

const FEATURES = [
  { icon: QrCode, text: 'Pointage sécurisé par carte à QR code, en ligne ou hors connexion' },
  { icon: BellRing, text: 'Notification instantanée des parents à chaque arrivée ou absence' },
  { icon: WifiOff, text: "Synchronisation automatique dès le retour du réseau" },
];

export default function LoginPage() {
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginForm) {
    setError(null);
    try {
      await login(values.username, values.password);
    } catch (err) {
      const message =
        err instanceof AxiosError ? (err.response?.data as { message?: string } | undefined)?.message : undefined;
      setError(message ?? 'Identifiants incorrects');
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-slate-50">
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 p-12 text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-white/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-black/10 blur-3xl"
        />

        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center ring-1 ring-white/20">
            <span className="text-sm font-bold tracking-tight">PS</span>
          </div>
          <span className="text-lg font-bold tracking-tight">Présence Scolaire</span>
        </div>

        <div className="relative space-y-8 max-w-md">
          <h1 className="text-3xl font-bold leading-tight tracking-tight">
            Le suivi de présence scolaire, simple et fiable.
          </h1>
          <p className="text-emerald-50/90 text-sm leading-relaxed">
            Un espace unique pour la direction : élèves, classes, personnel, absences et rapports —
            avec une vue en temps réel sur toute l'école.
          </p>
          <ul className="space-y-4">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3 text-sm text-emerald-50/90">
                <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15">
                  <Icon size={15} />
                </span>
                <span className="leading-relaxed">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-emerald-50/60">© {new Date().getFullYear()} Présence Scolaire</p>
      </div>

      <div className="flex items-center justify-center px-6 py-12">
        <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-sm space-y-6">
          <div className="lg:hidden flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-200">
              <span className="text-xs font-bold text-white">PS</span>
            </div>
            <span className="text-base font-bold text-zinc-900 tracking-tight">Présence Scolaire</span>
          </div>

          <div>
            <h2 className="text-xl font-bold text-zinc-900">Connexion</h2>
            <p className="text-sm text-zinc-500 mt-1">Espace direction — accédez à votre tableau de bord</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="username" className="text-sm font-medium text-zinc-700">
                Identifiant
              </label>
              <div className="relative">
                <User size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  id="username"
                  autoComplete="username"
                  autoFocus
                  {...register('username')}
                  className="w-full rounded-lg border border-zinc-200 bg-white pl-9 pr-3 py-2.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium text-zinc-700">
                Mot de passe
              </label>
              <div className="relative">
                <Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  {...register('password')}
                  className="w-full rounded-lg border border-zinc-200 bg-white pl-9 pr-10 py-2.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-1"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700">
              <AlertCircle size={16} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-zinc-900 text-white text-sm font-medium py-2.5 hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting && <Loader2 size={16} className="animate-spin" />}
            {isSubmitting ? 'Connexion...' : 'Se connecter'}
          </button>

          <p className="text-center text-xs text-zinc-400">
            En vous connectant, vous acceptez les{' '}
            <Link href="/cgu" className="underline hover:text-zinc-600">
              CGU
            </Link>{' '}
            et la{' '}
            <Link href="/confidentialite" className="underline hover:text-zinc-600">
              politique de confidentialité
            </Link>
            .
          </p>
        </form>
      </div>
    </div>
  );
}
