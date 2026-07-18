import { useState, useRef } from 'react';
import { Upload, Download, AlertCircle, CheckCircle, X } from 'lucide-react';
import { buildCsv, downloadFile, parseCsv } from '../utils/csv';
import { toISODate } from '../utils/format';

/**
 * Reusable bulk import/export bar.
 *
 * Props:
 *  - data: array of objects to export
 *  - columns: array of { key, label } defining CSV column order
 *  - onImport: (parsedRows) => void — receives array of objects parsed from CSV
 *  - filename: default export filename (without extension)
 *  - importLabel: optional label override
 *  - exportLabel: optional label override
 */
export default function BulkActions({ data, columns, onImport, filename = 'export', importLabel, exportLabel }) {
  const fileRef = useRef(null);
  const [message, setMessage] = useState(null);

  const flash = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  /* ---- EXPORT ---- */
  const handleExport = () => {
    if (!data || data.length === 0) {
      flash('error', 'No data to export');
      return;
    }
    downloadFile(buildCsv(data, columns), `${filename}_${toISODate()}.csv`);
    flash('success', `Exported ${data.length} rows`);
  };

  /* ---- IMPORT ---- */
  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.csv')) {
      flash('error', 'Only CSV files are supported');
      fileRef.current.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const rows = parseCsv(ev.target.result, columns);
        if (rows.length === 0) {
          flash('error', 'CSV file is empty or has no data rows');
          return;
        }
        onImport(rows);
        flash('success', `Imported ${rows.length} rows from CSV`);
      } catch {
        flash('error', 'Failed to parse CSV file');
      }
      fileRef.current.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {onImport && (
          <>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
            <button
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-primary/25 bg-primary/10 px-3 py-2 text-xs font-bold text-primary hover:bg-primary/15"
            >
              <Upload size={13} />
              {importLabel || 'Import CSV'}
            </button>
          </>
        )}
        <button
          onClick={handleExport}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-bold text-textSecondary hover:border-primary/40 hover:text-primary"
        >
          <Download size={13} />
          {exportLabel || 'Export CSV'}
        </button>
      </div>

      {message && (
        <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs shadow-sm ${message.type === 'success' ? 'bg-success/10 border-success/20 text-success' : 'bg-danger/10 border-danger/20 text-danger'}`}>
          {message.type === 'success' ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
          {message.text}
          <button onClick={() => setMessage(null)} className="ml-auto"><X size={12} /></button>
        </div>
      )}
    </div>
  );
}
