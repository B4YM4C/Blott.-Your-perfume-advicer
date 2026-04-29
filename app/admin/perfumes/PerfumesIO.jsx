'use client';

import { useRef, useState } from 'react';

/**
 * PerfumesIO — Export / Import CSV controls that sit above the perfume list.
 *
 * Export:  GET /api/admin/perfumes/export — browser handles the download.
 * Import:  read the chosen file as text, POST to /api/admin/perfumes/import
 *          with the chosen mode. Show a summary report afterwards.
 *
 * Two import modes:
 *   - upsert  — update by id, append new rows, leave un-listed perfumes alone (DEFAULT, safe)
 *   - replace — same as upsert, then DELETE any perfume not in the CSV (full sync)
 *
 * Reload of the underlying list is handled by router.refresh() so Server
 * Components on the same page re-render with the latest DB.
 */
export default function PerfumesIO() {
  const fileRef = useRef(null);
  const [mode, setMode] = useState('upsert');
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState(null); // { kind: 'ok'|'err', summary, errors }

  async function onExport() {
    // Plain anchor click — let the browser stream the attachment.
    window.location.href = '/api/admin/perfumes/export';
  }

  async function onImportPicked(ev) {
    const file = ev.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setReport(null);
    try {
      const text = await file.text();
      const url = `/api/admin/perfumes/import?mode=${encodeURIComponent(mode)}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/csv; charset=utf-8' },
        body: text,
      });
      const data = await res.json();
      if (!data.ok) {
        setReport({
          kind: 'err',
          summary: data.error || 'Import failed',
          errors: data.errors || [],
        });
      } else {
        const parts = [
          `${data.added} added`,
          `${data.updated} updated`,
          data.mode === 'replace' ? `${data.deleted} deleted` : null,
          data.skipped ? `${data.skipped} skipped` : null,
        ].filter(Boolean);
        setReport({
          kind: 'ok',
          summary: `Imported · ${parts.join(' · ')}`,
          errors: data.errors || [],
        });
        // Reload the page so the server-rendered list shows fresh data.
        // Slight delay so the success banner is visible before navigation.
        setTimeout(() => window.location.reload(), 700);
      }
    } catch (e) {
      setReport({ kind: 'err', summary: e.message, errors: [] });
    } finally {
      setBusy(false);
      // Reset the input so the same file can be re-selected.
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  function pickFile() { fileRef.current?.click(); }

  return (
    <div style={wrap}>
      <div style={controls}>
        <button type="button" className="btn ghost" onClick={onExport} disabled={busy}>
          ↓ Export CSV
        </button>

        <span style={divider} aria-hidden="true" />

        <label style={modeWrap}>
          <span style={modeLabel}>Import mode</span>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            style={select}
            disabled={busy}
          >
            <option value="upsert">Upsert (safe — update + append)</option>
            <option value="replace">Replace all (sync — delete missing)</option>
          </select>
        </label>

        <button type="button" className="btn" onClick={pickFile} disabled={busy}>
          {busy ? 'Importing…' : '↑ Import CSV'}
        </button>

        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          onChange={onImportPicked}
          style={{ display: 'none' }}
        />
      </div>

      <div style={hint}>
        คอลัมน์ที่ต้องมีอย่างน้อย: <code>id</code> หรือ <code>fragrance</code>;
        คอลัมน์อื่น (notes, blurb, image, แกน DNA) ใส่ตามต้องการ —
        notes ใช้ <code>;</code> คั่นในเซลล์เดียวกัน, ค่า DNA เป็นตัวเลข −10 ถึง +10
      </div>

      {report && (
        <div style={report.kind === 'ok' ? okBox : errBox}>
          <strong>{report.summary}</strong>
          {report.errors.length > 0 && (
            <details style={{ marginTop: 8 }}>
              <summary style={{ cursor: 'pointer', fontSize: 12 }}>
                {report.errors.length} warning{report.errors.length === 1 ? '' : 's'} — view details
              </summary>
              <ul style={errList}>
                {report.errors.slice(0, 50).map((e, i) => (
                  <li key={i}>
                    {e.line > 0 ? <code>line {e.line}</code> : <code>—</code>} · {e.message}
                  </li>
                ))}
                {report.errors.length > 50 && (
                  <li style={{ color: 'var(--grey-3)' }}>
                    …and {report.errors.length - 50} more
                  </li>
                )}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

const wrap = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  marginBottom: 18,
};
const controls = {
  display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10,
  padding: '14px 16px',
  background: 'var(--paper)',
  border: '1px solid var(--grey-5)',
  borderRadius: 'var(--radius-md)',
  boxShadow: 'var(--shadow-soft)',
};
const divider = {
  width: 1, height: 24, background: 'var(--grey-5)', margin: '0 4px',
};
const modeWrap = {
  display: 'inline-flex', flexDirection: 'column', gap: 2,
};
const modeLabel = {
  fontFamily: 'var(--font-mono)', fontSize: 9,
  letterSpacing: '.2em', textTransform: 'uppercase',
  color: 'var(--grey-3)',
};
const select = {
  padding: '6px 10px',
  fontFamily: 'var(--font-mono)', fontSize: 12,
  background: 'var(--paper)', border: '1px solid var(--grey-5)',
  borderRadius: 'var(--radius-sm)', color: 'var(--ink)',
};
const hint = {
  fontSize: 12, color: 'var(--grey-2)', lineHeight: 1.7,
  padding: '0 4px',
};
const okBox = {
  padding: '12px 14px', border: '1px solid var(--ink)',
  background: 'var(--ink)', color: 'var(--paper)',
  borderRadius: 'var(--radius-sm)', fontSize: 13,
};
const errBox = {
  padding: '12px 14px', border: '1px solid #b91c1c',
  background: '#fef2f2', color: '#b91c1c',
  borderRadius: 'var(--radius-sm)', fontSize: 13,
};
const errList = {
  margin: '8px 0 0', paddingLeft: 18,
  fontFamily: 'var(--font-mono)', fontSize: 11, lineHeight: 1.6,
};
