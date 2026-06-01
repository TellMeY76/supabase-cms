import Link from "next/link";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { updateInquiryStatusAction } from "@/app/(admin)/admin/actions";
import { getAdminInquiry } from "@/lib/admin-data";

const inquiryStatuses = ["new", "contacted", "closed", "spam"] as const;

export default async function AdminInquiryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const inquiry = await getAdminInquiry(id);
  if (!inquiry) notFound();

  return (
    <div>
      <div className="payload-page-header">
        <div>
          <p className="payload-eyebrow">{formatFormType(inquiry.formType)}</p>
          <h1>{inquiry.subject || inquiry.name}</h1>
          <p>Submitted {new Date(inquiry.createdAt).toLocaleString()}</p>
        </div>
        <Link className="payload-button payload-button--ghost" href="/admin/inquiries">
          Back to inquiries
        </Link>
      </div>

      <div className="payload-detail-grid">
        <section className="payload-form-section">
          <h2>Contact</h2>
          <DetailRow label="Name" value={inquiry.name} />
          <DetailRow label="Email" value={<a href={`mailto:${inquiry.email}`}>{inquiry.email}</a>} />
          <DetailRow label="Phone" value={inquiry.phone} />
          <DetailRow label="Messenger" value={inquiry.messenger} />
          <DetailRow label="Company" value={inquiry.company} />
          <DetailRow label="Source URL" value={inquiry.sourceUrl ? <a href={inquiry.sourceUrl}>{inquiry.sourceUrl}</a> : undefined} />
        </section>

        <section className="payload-form-section">
          <h2>Status</h2>
          <form action={updateInquiryStatusAction} className="payload-form">
            <input name="id" type="hidden" value={inquiry.id} />
            <input name="returnTo" type="hidden" value={`/admin/inquiries/${inquiry.id}`} />
            <div className="payload-field">
              <label htmlFor="status">Status</label>
              <select id="status" name="status" defaultValue={inquiry.status}>
                {inquiryStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <button className="payload-button" type="submit">
              Update status
            </button>
          </form>
          {inquiry.product && (
            <DetailRow
              label="Product"
              value={<Link href={`/admin/products/${inquiry.product.id}`}>{inquiry.product.title}</Link>}
            />
          )}
        </section>
      </div>

      <section className="payload-form-section payload-detail-section">
        <h2>Message</h2>
        <p className="payload-message-box">{inquiry.message}</p>
      </section>

      <section className="payload-form-section payload-detail-section">
        <h2>Submitted fields</h2>
        <KeyValueTable labels={inquiry.fieldLabels ?? {}} value={inquiry.payload ?? {}} />
      </section>

      <section className="payload-form-section payload-detail-section">
        <h2>Metadata</h2>
        <KeyValueTable value={inquiry.metadata ?? {}} />
      </section>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value?: ReactNode }) {
  return (
    <div className="payload-detail-row">
      <span>{label}</span>
      <strong>{value || "-"}</strong>
    </div>
  );
}

function KeyValueTable({ labels = {}, value }: { labels?: Record<string, string>; value: Record<string, unknown> }) {
  const entries = Object.entries(value).filter(([, item]) => item !== undefined && item !== null && item !== "");
  if (entries.length === 0) return <p className="payload-muted">No data.</p>;
  return (
    <div className="payload-kv-table">
      {entries.map(([key, item]) => (
        <div key={key}>
          <span>{labels[key] ?? key}</span>
          <strong>{formatValue(item)}</strong>
        </div>
      ))}
    </div>
  );
}

function formatValue(value: unknown): string {
  if (Array.isArray(value)) return value.map(formatValue).join(", ");
  if (typeof value === "object" && value !== null) return JSON.stringify(value, null, 2);
  return String(value);
}

function formatFormType(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
