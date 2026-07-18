/* Shared CSV import/export helpers.
 *
 * Centralizes the build/parse/download logic that was previously duplicated
 * across BulkActions, ReviewClaims and LabeledData.
 *
 * A column spec is an array of objects: { key, label, value? }.
 *  - key:   property name on the row object
 *  - label: CSV header text (defaults derived from key)
 *  - value: optional (row) => cellValue resolver for computed columns
 */

/** Escape a single CSV cell, quoting only when necessary. */
export function escapeCsvCell(value) {
  if (value == null) return '';
  const str = String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

/** Derive a column spec from the first row when none is provided. */
function resolveColumns(columns, sampleRow) {
  if (columns?.length) return columns;
  return Object.keys(sampleRow || {}).map((key) => ({
    key,
    label: key.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase()),
  }));
}

/** Build CSV text from an array of row objects and a column spec. */
export function buildCsv(rows, columns) {
  const resolved = resolveColumns(columns, rows[0]);
  const header = resolved.map((c) => c.label).join(',');
  const body = rows.map((row) =>
    resolved
      .map((c) => escapeCsvCell(typeof c.value === 'function' ? c.value(row) : row[c.key]))
      .join(',')
  );
  return [header, ...body].join('\n');
}

/** Trigger a browser download of text content as a file. */
export function downloadFile(content, filename, mime = 'text/csv;charset=utf-8;') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Build CSV and download it as `<base>_<YYYY-MM-DD>.csv`. */
export function downloadCsv(rows, columns, filenameBase = 'export') {
  const date = new Date().toISOString().slice(0, 10);
  downloadFile(buildCsv(rows, columns), `${filenameBase}_${date}.csv`);
}

/** Parse a single CSV line, handling quoted fields and escaped quotes. */
export function parseCsvLine(line) {
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
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

/**
 * Parse CSV text into an array of row objects.
 * Headers are matched to column keys case-insensitively by label or key.
 * Returns [] when there is no data row.
 */
export function parseCsv(text, columns) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]);
  const resolved = columns?.length ? columns : headers.map((h) => ({ key: h.trim(), label: h.trim() }));

  const keyMap = headers.map((h) => {
    const needle = h.toLowerCase().trim();
    const match = resolved.find(
      (c) => c.label.toLowerCase().trim() === needle || c.key.toLowerCase().trim() === needle
    );
    return match ? match.key : null;
  });

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = parseCsvLine(lines[i]);
    const obj = {};
    keyMap.forEach((key, idx) => {
      if (key) obj[key] = vals[idx]?.trim() || '';
    });
    if (Object.keys(obj).length > 0) rows.push(obj);
  }
  return rows;
}
