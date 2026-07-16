import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { CARD_HEIGHT, CARD_WIDTH } from '@/components/cards/student-card-visual';

// A4 à 96dpi (px), avec une grille de cartes par page — mêmes proportions
// que la mise en page d'impression navigateur (voir globals.css).
const PAGE_WIDTH = 794;
const PAGE_HEIGHT = 1123;
const MARGIN = 24;
const GAP = 16;
const COLUMNS = Math.floor((PAGE_WIDTH - 2 * MARGIN + GAP) / (CARD_WIDTH + GAP));
const ROWS = Math.floor((PAGE_HEIGHT - 2 * MARGIN + GAP) / (CARD_HEIGHT + GAP));
const CARDS_PER_PAGE = COLUMNS * ROWS;

export async function generateCardsPdf(nodes: HTMLElement[], filename: string): Promise<void> {
  const doc = new jsPDF({ unit: 'px', format: [PAGE_WIDTH, PAGE_HEIGHT] });

  for (let i = 0; i < nodes.length; i++) {
    if (i > 0 && i % CARDS_PER_PAGE === 0) {
      doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    }
    const canvas = await html2canvas(nodes[i], { useCORS: true, scale: 2, backgroundColor: '#ffffff' });
    const imageData = canvas.toDataURL('image/png');
    const positionInPage = i % CARDS_PER_PAGE;
    const col = positionInPage % COLUMNS;
    const row = Math.floor(positionInPage / COLUMNS);
    const x = MARGIN + col * (CARD_WIDTH + GAP);
    const y = MARGIN + row * (CARD_HEIGHT + GAP);
    doc.addImage(imageData, 'PNG', x, y, CARD_WIDTH, CARD_HEIGHT);
  }

  doc.save(filename);
}
