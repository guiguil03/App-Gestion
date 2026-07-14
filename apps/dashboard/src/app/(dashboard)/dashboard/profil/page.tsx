'use client';

import { useAuth } from '@/providers/auth-provider';

export default function ProfilPage() {
  const { session } = useAuth();

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-zinc-900">Profil</h1>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 max-w-sm">
        <p className="text-sm text-zinc-500">Identifiant</p>
        <p className="text-sm font-semibold text-zinc-900">{session?.username}</p>
      </div>
    </div>
  );
}
