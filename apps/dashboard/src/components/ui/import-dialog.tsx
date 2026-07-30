'use client';

import { useRef, useState } from 'react';
import { Download, Upload, X } from 'lucide-react';
import { downloadImportTemplate, parseImportFile } from '@/lib/import/parse-file';

export type ImportResult = { created: number; skipped?: number; errors: { row: number; message: string }[] };

type ImportDialogProps = {
  open: boolean;
  title: string;
  description: string;
  templateHeaders: string[];
  templateSampleRow: string[];
  templateFilename: string;
  onImport: (rows: Record<string, string>[]) => Promise<ImportResult>;
  onClose: () => void;
};

export function ImportDialog({
  open,
  title,
  description,
  templateHeaders,
  templateSampleRow,
  templateFilename,
  onImport,
  onClose,
}: ImportDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<Record<string, string>[] | null>(null);
  const [fileName, setFileName] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  if (!open) return null;

  function reset() {
    setRows(null);
    setFileName('');
    setResult(null);
    setParseError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setParseError(null);
    setResult(null);
    setFileName(file.name);
    try {
      const parsed = await parseImportFile(file);
      if (parsed.length === 0) {
        setParseError('Le fichier est vide ou ne contient aucune ligne de données.');
        setRows(null);
        return;
      }
      setRows(parsed);
    } catch {
      setParseError("Impossible de lire ce fichier. Vérifie qu'il s'agit bien d'un CSV ou Excel valide.");
      setRows(null);
    }
  }

  async function handleImport() {
    if (!rows) return;
    setIsImporting(true);
    setParseError(null);
    try {
      const res = await onImport(rows);
      setResult(res);
      setRows(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch {
      setParseError("Échec de l'import. Réessaie.");
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 px-4"
      onClick={handleClose}
    >
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-zinc-900">{title}</h2>
            <p className="mt-1 text-sm text-zinc-500">{description}</p>
          </div>
          <button type="button" onClick={handleClose} className="flex-shrink-0 p-1 text-zinc-400 hover:text-zinc-600">
            <X size={18} />
          </button>
        </div>

        <button
          type="button"
          onClick={() => downloadImportTemplate(templateHeaders, templateSampleRow, templateFilename)}
          className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-700"
        >
          <Download size={14} /> Télécharger le modèle (Excel)
        </button>

        <div className="mt-4 space-y-1.5">
          <label className="text-xs font-medium text-zinc-500">Fichier (CSV ou Excel)</label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={(e) => void handleFileChange(e)}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-zinc-100 file:px-2.5 file:py-1 file:text-xs file:font-medium"
          />
          {fileName && rows && (
            <p className="text-xs text-zinc-500">
              {rows.length} ligne(s) détectée(s) dans « {fileName} ».
            </p>
          )}
          {parseError && <p className="text-xs text-red-600">{parseError}</p>}
        </div>

        {result && (
          <div className="mt-4 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
            <p className="text-zinc-700">
              <span className="font-semibold text-emerald-600">{result.created}</span> créé(s)
              {typeof result.skipped === 'number' && (
                <>
                  {' '}
                  · <span className="font-semibold text-zinc-500">{result.skipped}</span> déjà existant(s), ignoré(s)
                </>
              )}
              {result.errors.length > 0 && (
                <>
                  {' '}
                  · <span className="font-semibold text-red-600">{result.errors.length}</span> erreur(s)
                </>
              )}
            </p>
            {result.errors.length > 0 && (
              <ul className="max-h-40 space-y-1 overflow-y-auto text-xs text-red-700">
                {result.errors.map((err, i) => (
                  <li key={i}>
                    Ligne {err.row} : {err.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg border border-zinc-200 px-3.5 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Fermer
          </button>
          <button
            type="button"
            disabled={!rows || isImporting}
            onClick={() => void handleImport()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            <Upload size={14} />
            {isImporting ? 'Import en cours…' : `Importer${rows ? ` (${rows.length})` : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}
