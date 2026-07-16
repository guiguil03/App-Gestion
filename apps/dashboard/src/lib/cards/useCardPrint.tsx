'use client';

import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { StudentCardVisual } from '@/components/cards/student-card-visual';
import { generateCardsPdf } from '@/lib/cards/pdf';
import { generateQrDataUrl } from '@/lib/cards/qr';
import type { CardStudent } from '@/types/cards';

export type PrintableCard = { student: CardStudent; qrValue: string };

/** Attend que toutes les <img> du conteneur soient chargées (ou en erreur), avec un filet de sécurité. */
function waitForImages(container: HTMLElement, timeoutMs = 5000): Promise<void> {
  const images = Array.from(container.querySelectorAll('img'));
  const pending = images.filter((img) => !img.complete);
  if (pending.length === 0) return Promise.resolve();

  return new Promise((resolve) => {
    let remaining = pending.length;
    const done = () => {
      remaining -= 1;
      if (remaining <= 0) resolve();
    };
    pending.forEach((img) => {
      img.addEventListener('load', done, { once: true });
      img.addEventListener('error', done, { once: true });
    });
    setTimeout(resolve, timeoutMs);
  });
}

/** Gère le rendu hors-écran des cartes élève à imprimer/exporter (portail vers document.body, cf. #card-print-area dans globals.css). */
export function useCardPrint() {
  const [entries, setEntries] = useState<{ student: CardStudent; qrDataUrl: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  async function prepare(cards: PrintableCard[]) {
    const resolved = await Promise.all(
      cards.map(async (c) => ({ student: c.student, qrDataUrl: await generateQrDataUrl(c.qrValue) })),
    );
    nodeRefs.current.clear();
    setEntries(resolved);
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    if (containerRef.current) {
      await waitForImages(containerRef.current);
    }
  }

  async function print(cards: PrintableCard[]) {
    if (cards.length === 0) return;
    setBusy(true);
    try {
      await prepare(cards);
      window.print();
    } finally {
      setBusy(false);
    }
  }

  async function downloadPdf(cards: PrintableCard[], filename: string) {
    if (cards.length === 0) return;
    setBusy(true);
    try {
      await prepare(cards);
      const nodes = cards.map((c) => nodeRefs.current.get(c.student.id)).filter((n): n is HTMLDivElement => !!n);
      await generateCardsPdf(nodes, filename);
    } finally {
      setBusy(false);
      setEntries([]);
    }
  }

  const portal =
    typeof document !== 'undefined'
      ? createPortal(
          <div id="card-print-area" ref={containerRef}>
            {entries.map((entry) => (
              <div key={entry.student.id} className="student-card-print-item">
                <StudentCardVisual
                  ref={(el) => {
                    if (el) nodeRefs.current.set(entry.student.id, el);
                  }}
                  student={entry.student}
                  qrDataUrl={entry.qrDataUrl}
                />
              </div>
            ))}
          </div>,
          document.body,
        )
      : null;

  return { print, downloadPdf, busy, portal };
}
