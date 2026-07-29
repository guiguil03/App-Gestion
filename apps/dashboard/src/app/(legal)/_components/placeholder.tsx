export function Fill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-medium">
      {children}
    </span>
  );
}

export function DraftNotice() {
  return (
    <div className="mb-8 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      <strong>Brouillon.</strong> Ce document est un modèle générique à personnaliser avec les
      informations réelles de l'établissement (encadrés en surbrillance) et à faire valider par un
      juriste avant publication.
    </div>
  );
}
