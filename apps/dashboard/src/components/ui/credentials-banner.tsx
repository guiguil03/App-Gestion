'use client';

import { useState } from 'react';
import { Check, Copy, X } from 'lucide-react';

type CredentialsBannerProps = {
  label: string;
  username: string;
  password: string | null;
  onDismiss: () => void;
};

export function CredentialsBanner({ label, username, password, onDismiss }: CredentialsBannerProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const text = password ? `${username} / ${password}` : username;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
      <div>
        <p className="font-medium">{label}</p>
        <p className="mt-0.5">
          Identifiant <strong>{username}</strong>
          {password ? (
            <>
              , mot de passe <strong>{password}</strong>. Note-le maintenant : il ne sera plus jamais affiché.
            </>
          ) : (
            ' (compte déjà existant, mot de passe non récupérable — utilise une régénération si besoin).'
          )}
        </p>
      </div>
      <div className="flex flex-shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => void handleCopy()}
          title="Copier"
          className="rounded-lg p-1.5 text-emerald-700 hover:bg-emerald-100"
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
        </button>
        <button
          type="button"
          onClick={onDismiss}
          title="Fermer"
          className="rounded-lg p-1.5 text-emerald-700 hover:bg-emerald-100"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
