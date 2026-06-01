import Link from "next/link";
import { updateInquiryStatusAction } from "@/app/(admin)/admin/actions";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { listAdminInquiries } from "@/lib/admin-data";

const inquiryStatuses = ["new", "contacted", "closed", "spam"] as const;
const perPage = 20;

export default async function AdminInquiriesPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; formType?: string; page?: string; status?: string; success?: string }>;
}) {
  const params = await searchParams;
  const inquiries = await listAdminInquiries({
    formType: params.formType || undefined,
    status: params.status || undefined
  });
  const page = clampPage(params.page, inquiries.length, perPage);
  const pagedInquiries = inquiries.slice((page - 1) * perPage, page * perPage);
  const formTypes = [...new Set(inquiries.map((inquiry) => inquiry.formType))].sort();

  return (
    <div>
      <div className="payload-page-header">
        <div>
          <h1>Inquiries</h1>
          <p>Review product, contact, and custom form submissions in one inbox.</p>
        </div>
      </div>

      {params.error && <div className="payload-alert payload-alert--danger">{params.error}</div>}
      {params.success && <div className="payload-alert payload-alert--success">{params.success}</div>}

      <form className="payload-filterbar">
        <label>
          <span>Status</span>
          <select name="status" defaultValue={params.status ?? ""}>
            <option value="">All statuses</option>
            {inquiryStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Form type</span>
          <select name="formType" defaultValue={params.formType ?? ""}>
            <option value="">All forms</option>
            {formTypes.map((formType) => (
              <option key={formType} value={formType}>
                {formatFormType(formType)}
              </option>
            ))}
          </select>
        </label>
        <button className="payload-button payload-button--small" type="submit">
          Filter
        </button>
        <Link className="payload-button payload-button--ghost payload-button--small" href="/admin/inquiries">
          Reset
        </Link>
      </form>

      <div className="payload-table-wrap">
        <table className="payload-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Status</th>
              <th>Form</th>
              <th>Contact</th>
              <th>Company</th>
              <th>Product</th>
              <th>Subject / Message</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pagedInquiries.map((inquiry) => (
              <tr key={inquiry.id}>
                <td>{new Date(inquiry.createdAt).toLocaleString()}</td>
                <td>
                  <span className={`payload-status payload-status--${inquiry.status}`}>{inquiry.status}</span>
                </td>
                <td>
                  <span className="payload-level-badge">{formatFormType(inquiry.formType)}</span>
                </td>
                <td>
                  <div className="payload-title-cell">
                    <strong>{inquiry.name}</strong>
                    <a href={`mailto:${inquiry.email}`}>{inquiry.email}</a>
                    {(inquiry.phone || inquiry.messenger) && <span>{inquiry.phone || inquiry.messenger}</span>}
                  </div>
                </td>
                <td>{inquiry.company || "-"}</td>
                <td>
                  {inquiry.product ? (
                    <Link href={`/admin/products/${inquiry.product.id}`}>{inquiry.product.title}</Link>
                  ) : (
                    "-"
                  )}
                </td>
                <td>
                  <div className="payload-inquiry-summary">
                    <strong>{inquiry.subject || "No subject"}</strong>
                    <span>{inquiry.message}</span>
                  </div>
                </td>
                <td>
                  <div className="payload-table-actions">
                    <Link className="payload-action-button" href={`/admin/inquiries/${inquiry.id}`}>
                      View
                    </Link>
                    <form action={updateInquiryStatusAction} className="payload-inline-form">
                      <input name="id" type="hidden" value={inquiry.id} />
                      <select aria-label={`Status for ${inquiry.name}`} name="status" defaultValue={inquiry.status}>
                        {inquiryStatuses.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                      <button className="payload-action-button payload-action-button--primary" type="submit">
                        Save
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {inquiries.length === 0 && (
              <tr>
                <td className="payload-empty-cell" colSpan={8}>
                  No inquiries found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AdminPagination
        basePath="/admin/inquiries"
        page={page}
        perPage={perPage}
        query={{ formType: params.formType, status: params.status }}
        total={inquiries.length}
      />
    </div>
  );
}

function clampPage(pageParam: string | undefined, total: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Number(pageParam ?? "1");
  if (!Number.isFinite(page)) return 1;
  return Math.min(Math.max(Math.floor(page), 1), totalPages);
}

function formatFormType(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
