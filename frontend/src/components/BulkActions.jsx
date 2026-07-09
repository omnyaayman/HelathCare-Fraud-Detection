import { useState, useRef } from 'react';
import { Upload, Download, AlertCircle, CheckCircle, X } from 'lucide-react';

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
    const header = columns.map((c) => c.label).join(',');
    const rows = data.map((row) =>
      columns.map((c) => {
        const val = row[c.key];
        if (val == null) return '';
        const str = String(val);
        return str.includes(',') || str.includes('"') || str.includes('\n')
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      }).join(',')
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
        const text = ev.target.result;
        const lines = text.split(/\r?\n/).filter((l) => l.trim());
        if (lines.length < 2) {
          flash('error', 'CSV file is empty or has no data rows');
          return;
        }
        const headerLine = lines[0];
        const headers = parseCSVLine(headerLine);

        // Map CSV headers to column keys (case-insensitive, trimmed)
        const keyMap = headers.map((h) => {
          const match = columns.find(
            (c) => c.label.toLowerCase().trim() === h.toLowerCase().trim() || c.key.toLowerCase().trim() === h.toLowerCase().trim()
          );
          return match ? match.key : null;
        });

        const rows = [];
        for (let i = 1; i < lines.length; i++) {
          const vals = parseCSVLine(lines[i]);
          const obj = {};
          keyMap.forEach((key, idx) => {
            if (key) obj[key] = vals[idx]?.trim() || '';
          });
          if (Object.keys(obj).length > 0) rows.push(obj);
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
              className="flex items-center gap-2 px-3 py-1.5 text-xs bg-primary/10 border border-primary/25 rounded-md text-primary hover:bg-primary/20 transition-colors duration-150"
            >
              <Upload size={13} />
              {importLabel || 'Import CSV'}
            </button>
          </>
        )}
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-3 py-1.5 text-xs bg-surface border border-border rounded-md text-textSecondary hover:text-textPrimary hover:border-textSecondary transition-colors duration-150"
        >
          <Download size={13} />
          {exportLabel || 'Export CSV'}
        </button>
      </div>

      {message && (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs ${message.type === 'success' ? 'bg-success/10 border border-success/20 text-success' : 'bg-danger/10 border border-danger/20 text-danger'}`}>
          {message.type === 'success' ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
          {message.text}
          <button onClick={() => setMessage(null)} className="ml-auto"><X size={12} /></button>
        </div>
      )}
    </div>
  );
}

/** Parse a single CSV line handling quoted fields */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        result.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
  }
  result.push(current);
  return result;
}
