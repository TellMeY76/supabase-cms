"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Upload } from "lucide-react";

export default function MigrationWizardPage() {
  const [sourceSiteUrl, setSourceSiteUrl] = useState("https://example.com");
  const [preview, setPreview] = useState<any>(null);
  const [importResult, setImportResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const resultRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (importResult) resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [importResult]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    form.set("sourceSiteUrl", sourceSiteUrl);
    const response = await fetch("/api/migrations/preview", {
      method: "POST",
      body: form
    });
    const payload = await response.json();
    setLoading(false);
    if (!response.ok) {
      setError(payload.error ?? "Preview failed");
      return;
    }
    setPreview(payload);
    setImportResult(null);
  }

  async function onImport() {
    const formElement = document.querySelector<HTMLFormElement>("#migration-form");
    if (!formElement) return;
    setImporting(true);
    setError(null);
    const form = new FormData(formElement);
    form.set("sourceSiteUrl", sourceSiteUrl);
    const response = await fetch("/api/migrations/import", {
      method: "POST",
      body: form
    });
    const payload = await response.json();
    setImporting(false);
    if (!response.ok) {
      setError(payload.error ?? "Import failed");
      return;
    }
    setImportResult(payload);
  }

  return (
    <div>
      <h1>Migration Wizard</h1>
      <p style={{ color: "var(--muted)" }}>
        Upload WordPress WXR/XML and WooCommerce product CSV files. The preview step validates counts, mappings, SEO
        plugins, media references, and warnings before import.
      </p>
      <form id="migration-form" className="form" onSubmit={onSubmit} style={{ maxWidth: 760, marginTop: 24 }}>
        <div className="field">
          <label htmlFor="sourceSiteUrl">Old site URL</label>
          <input id="sourceSiteUrl" value={sourceSiteUrl} onChange={(event) => setSourceSiteUrl(event.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="files">WordPress XML / WooCommerce CSV</label>
          <input id="files" name="files" type="file" multiple accept=".xml,.csv,text/xml,text/csv" required />
        </div>
        <button className="button" type="submit" disabled={loading}>
          <Upload size={16} />
          <span style={{ marginLeft: 8 }}>{loading ? "Previewing" : "Preview migration"}</span>
        </button>
      </form>
      {error && <p style={{ color: "var(--danger)" }}>{error}</p>}
      {preview && (
        <section className="section">
          <h2>Preview</h2>
          <button className="button" type="button" disabled={importing} onClick={onImport}>
            {importing ? "Importing" : "Import now"}
          </button>
          <pre className="card__body" style={{ overflow: "auto", background: "#fff", border: "1px solid var(--line)" }}>
            {JSON.stringify(preview, null, 2)}
          </pre>
        </section>
      )}
      {importResult && (
        <section className="section" ref={resultRef}>
          <div className="payload-alert payload-alert--success">
            <CheckCircle2 size={18} />
            <span>
              {importResult.message ?? "Import completed."} Imported {importResult.imported ?? 0}, updated{" "}
              {importResult.updated ?? 0}, skipped {importResult.skipped ?? 0}.
            </span>
          </div>
          <h2>Import result</h2>
          <div className="payload-grid" style={{ marginBottom: 14 }}>
            <div className="payload-card">
              <h3>Imported</h3>
              <p>{importResult.imported ?? 0}</p>
            </div>
            <div className="payload-card">
              <h3>Updated</h3>
              <p>{importResult.updated ?? 0}</p>
            </div>
            <div className="payload-card">
              <h3>Skipped</h3>
              <p>{importResult.skipped ?? 0}</p>
            </div>
          </div>
          <pre className="card__body" style={{ overflow: "auto", background: "#fff", border: "1px solid var(--line)" }}>
            {JSON.stringify(importResult, null, 2)}
          </pre>
        </section>
      )}
    </div>
  );
}
