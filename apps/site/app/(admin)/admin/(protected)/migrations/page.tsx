"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Database, FileArchive, Link2, RefreshCw, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type MigrationCounts = Record<string, number>;

interface MigrationWarning {
  code?: string;
  message: string;
}

interface MigrationPreview {
  connector?: string;
  counts?: MigrationCounts;
  warnings?: MigrationWarning[];
}

interface MigrationImportResult {
  message?: string;
  imported?: number;
  updated?: number;
  skipped?: number;
}

interface WooCommerceSyncResult {
  message?: string;
  fetched?: {
    categories?: number;
    products?: number;
  };
  updated?: {
    categories?: number;
    products?: number;
    media?: number;
  };
  skipped?: {
    categories?: number;
    products?: number;
  };
  urlReplacement?: {
    from: string;
    to: string;
  };
  warnings?: string[];
}

export default function MigrationWizardPage() {
  const [sourceSiteUrl, setSourceSiteUrl] = useState("");
  const [replacementSiteUrl, setReplacementSiteUrl] = useState("");
  const [wooSiteUrl, setWooSiteUrl] = useState("https://inshowhome.com");
  const [wooApiKey, setWooApiKey] = useState("");
  const [wooSourceSiteUrl, setWooSourceSiteUrl] = useState("");
  const [wooReplacementSiteUrl, setWooReplacementSiteUrl] = useState("");
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [preview, setPreview] = useState<MigrationPreview | null>(null);
  const [importResult, setImportResult] = useState<MigrationImportResult | null>(null);
  const [wooSyncResult, setWooSyncResult] = useState<WooCommerceSyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [wooSyncing, setWooSyncing] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const resultRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (importResult) resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [importResult]);

  useEffect(() => {
    if (!importing) return;
    setImportProgress(8);
    const timer = window.setInterval(() => {
      setImportProgress((value) => Math.min(92, value + Math.max(1, Math.round((95 - value) * 0.08))));
    }, 420);
    return () => window.clearInterval(timer);
  }, [importing]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    form.set("sourceSiteUrl", sourceSiteUrl);
    form.set("replacementSiteUrl", replacementSiteUrl);
    const response = await fetch("/api/migrations/preview", {
      method: "POST",
      body: form
    });
    const payload = await parseApiPayload(response);
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
    setImportProgress(8);
    setError(null);
    const form = new FormData(formElement);
    form.set("sourceSiteUrl", sourceSiteUrl);
    form.set("replacementSiteUrl", replacementSiteUrl);
    const response = await fetch("/api/migrations/import", {
      method: "POST",
      body: form
    });
    const payload = await parseApiPayload(response);
    setImporting(false);
    setImportProgress(response.ok ? 100 : 0);
    if (!response.ok) {
      setError(payload.error ?? "Import failed");
      return;
    }
    setImportResult(payload);
  }

  async function onWooSync(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWooSyncing(true);
    setError(null);
    setWooSyncResult(null);
    const response = await fetch("/api/migrations/woocommerce-sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        siteUrl: wooSiteUrl,
        apiKey: wooApiKey,
        sourceSiteUrl: wooSourceSiteUrl,
        replacementSiteUrl: wooReplacementSiteUrl
      })
    });
    const payload = await parseApiPayload(response);
    setWooSyncing(false);
    if (!response.ok) {
      setError(payload.error ?? "WooCommerce REST sync failed");
      return;
    }
    setWooSyncResult(payload);
  }

  return (
    <div className="migration-page">
      <div className="payload-page-header">
        <div>
          <p className="payload-eyebrow">WordPress / WooCommerce</p>
          <h1>Migration Wizard</h1>
          <p>Preview imported entities, inspect warnings, then import products, posts, pages, categories, and remote media references.</p>
        </div>
        <div className="payload-page-actions">
          <Dialog>
            <DialogTrigger asChild>
              <button className="payload-button payload-button--ghost" type="button">
                <RefreshCw size={16} />
                WooCommerce REST sync
              </button>
            </DialogTrigger>
            <DialogContent className="woo-sync-dialog">
              <DialogHeader>
                <DialogTitle>Supplement from WooCommerce REST API</DialogTitle>
              </DialogHeader>
              <form className="woo-sync-form" onSubmit={onWooSync}>
                <p>
                  Fill in the old WooCommerce site. URL replacement is optional; media still stays as remote URLs.
                </p>
                <label>
                  <span>Site URL</span>
                  <input
                    required
                    placeholder="https://inshowhome.com"
                    value={wooSiteUrl}
                    onChange={(event) => setWooSiteUrl(event.target.value)}
                  />
                </label>
                <label>
                  <span>API key <small>optional</small></span>
                  <input
                    placeholder="ck_xxx, ck_xxx:cs_xxx, or consumer_key=...&consumer_secret=..."
                    value={wooApiKey}
                    onChange={(event) => setWooApiKey(event.target.value)}
                  />
                </label>
                <div className="woo-sync-replacement-grid">
                  <label>
                    <span>Old URL to find <small>optional</small></span>
                    <input
                      placeholder="Defaults to Site URL"
                      value={wooSourceSiteUrl}
                      onChange={(event) => setWooSourceSiteUrl(event.target.value)}
                    />
                  </label>
                  <label>
                    <span>New replacement URL <small>optional</small></span>
                    <input
                      placeholder="https://your-new-domain.com"
                      value={wooReplacementSiteUrl}
                      onChange={(event) => setWooReplacementSiteUrl(event.target.value)}
                    />
                  </label>
                </div>
                <small className="woo-sync-help">
                  When a new replacement URL is provided, matching URLs in WooCommerce images, HTML, permalinks, and source metadata are rewritten before saving.
                </small>
                <button className="payload-button migration-primary-action" disabled={wooSyncing} type="submit">
                  <RefreshCw className={wooSyncing ? "payload-refresh-icon is-spinning" : undefined} size={16} />
                  {wooSyncing ? "Syncing" : "Start sync"}
                </button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {error && (
        <div className="payload-alert payload-alert--danger">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      <div className="migration-workbench">
        <form id="migration-form" className="migration-card migration-form-card" onSubmit={onSubmit}>
          <div className="migration-card__header">
            <span className="migration-step">1</span>
            <div>
              <h2>Source and files</h2>
              <p>Both URL fields are optional. Leave them empty to import using the default inshowhome.com source.</p>
            </div>
          </div>

          <div className="migration-url-grid">
            <div className="migration-field">
              <label htmlFor="sourceSiteUrl">
                <Link2 size={15} />
                Old URL to find
              </label>
              <input
                id="sourceSiteUrl"
                name="sourceSiteUrl"
                placeholder="https://inshowhome.com"
                value={sourceSiteUrl}
                onChange={(event) => setSourceSiteUrl(event.target.value)}
              />
              <small>Used as source URL and replacement target when paired with the new URL.</small>
            </div>
            <div className="migration-field">
              <label htmlFor="replacementSiteUrl">
                <Link2 size={15} />
                New replacement URL
              </label>
              <input
                id="replacementSiteUrl"
                name="replacementSiteUrl"
                placeholder="https://your-new-domain.com"
                value={replacementSiteUrl}
                onChange={(event) => setReplacementSiteUrl(event.target.value)}
              />
              <small>Optional. Rewrites matching old URLs inside uploaded XML/CSV before preview and import.</small>
            </div>
          </div>

          <label className="migration-dropzone" htmlFor="files">
            <FileArchive size={24} />
            <strong>WordPress XML / WooCommerce CSV</strong>
            <span>{fileNames.length ? `${fileNames.length} file(s) selected` : "Choose XML or CSV files for preview"}</span>
            <input
              id="files"
              name="files"
              type="file"
              multiple
              accept=".xml,.csv,text/xml,text/csv"
              required
              onChange={(event) => setFileNames(Array.from(event.currentTarget.files ?? []).map((file) => file.name))}
            />
          </label>

          {fileNames.length > 0 && (
            <div className="migration-file-list">
              {fileNames.map((name) => (
                <span key={name}>{name}</span>
              ))}
            </div>
          )}

          <button className="payload-button migration-primary-action" type="submit" disabled={loading}>
            <Upload size={16} />
            <span>{loading ? "Previewing" : "Preview migration"}</span>
          </button>
        </form>

        <aside className="migration-card migration-status-card">
          <div className="migration-card__header">
            <span className="migration-step">2</span>
            <div>
              <h2>Import flow</h2>
              <p>Preview first, then import. Remote media URLs are kept as old-site references unless you replace URLs above.</p>
            </div>
          </div>
          <div className="migration-flow-list">
            <div className={preview ? "is-done" : undefined}>
              <CheckCircle2 size={17} />
              <span>Parse uploaded files</span>
            </div>
            <div className={preview ? "is-done" : undefined}>
              <Database size={17} />
              <span>Validate entity counts</span>
            </div>
            <div className={importResult ? "is-done" : importing ? "is-active" : undefined}>
              <Upload size={17} />
              <span>Import into Supabase</span>
            </div>
          </div>
          {(importing || importProgress > 0) && (
            <div className="migration-progress" aria-label="Import progress" aria-valuemax={100} aria-valuemin={0} aria-valuenow={importProgress} role="progressbar">
              <div className="migration-progress__bar" style={{ width: `${importProgress}%` }} />
              <span>{importing ? `Importing ${importProgress}%` : "Import completed"}</span>
            </div>
          )}
        </aside>
      </div>

      {preview && (
        <section className="migration-card migration-preview-card">
          <div className="migration-preview-header">
            <div>
              <p className="payload-eyebrow">Preview</p>
              <h2>{preview.connector ?? "Migration"} summary</h2>
            </div>
            <button className="payload-button" type="button" disabled={importing} onClick={onImport}>
              {importing ? "Importing" : "Import now"}
            </button>
          </div>

          <div className="migration-count-grid">
            {Object.entries(preview.counts ?? {}).map(([key, value]) => (
              <div className="migration-count-card" key={key}>
                <span>{formatLabel(key)}</span>
                <strong>{String(value)}</strong>
              </div>
            ))}
          </div>

          {preview.warnings?.length ? (
            <div className="migration-warning-list">
              {preview.warnings.slice(0, 6).map((warning, index) => (
                <div className="payload-alert payload-alert--warning" key={`${warning.code ?? warning.message}-${index}`}>
                  <AlertTriangle size={16} />
                  <span>{warning.message}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="payload-alert payload-alert--success">
              <CheckCircle2 size={17} />
              <span>No blocking warnings detected in preview.</span>
            </div>
          )}

          <details className="migration-json-details">
            <summary>View raw preview JSON</summary>
            <pre>{JSON.stringify(preview, null, 2)}</pre>
          </details>
        </section>
      )}
      {wooSyncResult && (
        <section className="migration-card migration-result-card">
          <div className="payload-alert payload-alert--success">
            <CheckCircle2 size={18} />
            <span>{wooSyncResult.message ?? "WooCommerce REST data sync completed."}</span>
          </div>
          <div className="migration-result-grid migration-result-grid--wide">
            <div><span>Fetched categories</span><strong>{wooSyncResult.fetched?.categories ?? 0}</strong></div>
            <div><span>Fetched products</span><strong>{wooSyncResult.fetched?.products ?? 0}</strong></div>
            <div><span>Updated categories</span><strong>{wooSyncResult.updated?.categories ?? 0}</strong></div>
            <div><span>Updated products</span><strong>{wooSyncResult.updated?.products ?? 0}</strong></div>
            <div><span>Remote media refs</span><strong>{wooSyncResult.updated?.media ?? 0}</strong></div>
            <div><span>Skipped categories</span><strong>{wooSyncResult.skipped?.categories ?? 0}</strong></div>
            <div><span>Skipped products</span><strong>{wooSyncResult.skipped?.products ?? 0}</strong></div>
          </div>
          {wooSyncResult.urlReplacement ? (
            <div className="payload-alert payload-alert--info">
              <Link2 size={16} />
              <span>
                URL replacement applied: {wooSyncResult.urlReplacement.from} -&gt; {wooSyncResult.urlReplacement.to}
              </span>
            </div>
          ) : null}
          {wooSyncResult.warnings?.length ? (
            <div className="migration-warning-list">
              {wooSyncResult.warnings.map((warning: string, index: number) => (
                <div className="payload-alert payload-alert--warning" key={`${warning}-${index}`}>
                  <AlertTriangle size={16} />
                  <span>{warning}</span>
                </div>
              ))}
            </div>
          ) : null}
          <details className="migration-json-details">
            <summary>View raw WooCommerce sync JSON</summary>
            <pre>{JSON.stringify(wooSyncResult, null, 2)}</pre>
          </details>
        </section>
      )}
      {importResult && (
        <section className="migration-card migration-result-card" ref={resultRef}>
          <div className="payload-alert payload-alert--success">
            <CheckCircle2 size={18} />
            <span>
              {importResult.message ?? "Import completed."} Imported {importResult.imported ?? 0}, updated{" "}
              {importResult.updated ?? 0}, skipped {importResult.skipped ?? 0}.
            </span>
          </div>
          <div className="migration-result-grid">
            <div><span>Imported</span><strong>{importResult.imported ?? 0}</strong></div>
            <div><span>Updated</span><strong>{importResult.updated ?? 0}</strong></div>
            <div><span>Skipped</span><strong>{importResult.skipped ?? 0}</strong></div>
          </div>
          <details className="migration-json-details">
            <summary>View raw import JSON</summary>
            <pre>{JSON.stringify(importResult, null, 2)}</pre>
          </details>
        </section>
      )}
    </div>
  );
}

async function parseApiPayload(response: Response): Promise<any> {
  const text = await response.text();
  if (!text) {
    return { error: `The server returned an empty response (${response.status}). Check the server logs for this request.` };
  }

  try {
    return JSON.parse(text);
  } catch {
    return { error: `The server returned an invalid response (${response.status}).` };
  }
}

function formatLabel(value: string) {
  return value.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase());
}
