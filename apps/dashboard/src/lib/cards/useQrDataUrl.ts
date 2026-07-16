import { useEffect, useState } from 'react';
import { generateQrDataUrl } from '@/lib/cards/qr';

/** Génère (et met en cache pour la durée du composant) le data URL du QR à partir de la chaîne signée renvoyée par le backend. */
export function useQrDataUrl(qrValue: string | null): string | null {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!qrValue) {
      setDataUrl(null);
      return;
    }
    void generateQrDataUrl(qrValue).then((url) => {
      if (!cancelled) setDataUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [qrValue]);

  return dataUrl;
}
