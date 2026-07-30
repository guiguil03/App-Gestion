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
    // Fixe (pas dans le flux de page) : un provisioning peut se déclencher
    // depuis une ligne tout en bas d'une longue liste (Élèves, Personnel...)
    // — un bandeau inline placé en haut de page passerait alors inaperçu, le
    // mot de passe étant justement non récupérable une fois raté.
    <div className="fixed bottom-4 right-4 left-4 sm:left-auto z-[70] sm:max-w-md">
      <div className="flex items-start justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 shadow-lg shadow-emerald-900/10">
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
    </div>
  );
}
