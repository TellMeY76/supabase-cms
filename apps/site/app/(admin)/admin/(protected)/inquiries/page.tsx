import { AdminPagination } from "@/components/admin/AdminPagination";
import { InquiryDataDialog } from "@/components/admin/InquiryDataDialog";
import { RefreshButton } from "@/components/admin/RefreshButton";
import { listAdminInquiriesPage, type AdminInquiry } from "@/lib/admin-data";

const perPage = 20;

export default async function AdminInquiriesPage({
  searchParams
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const inquiriesPage = await listAdminInquiriesPage({ page: params.page, perPage });
  const inquiries = inquiriesPage.items;

  return (
    <div>
      <div className="payload-page-header">
        <div>
          <h1>Inquiries</h1>
          <p>Review submitted forms by date, form name, and captured form data.</p>
        </div>
        <div className="payload-page-actions">
          <RefreshButton />
        </div>
      </div>

      <div className="payload-table-wrap">
        <table className="payload-table payload-table--inquiries">
          <thead>
            <tr>
              <th>Date</th>
              <th>Form name</th>
              <th>Form data</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {inquiries.map((inquiry) => {
              const formData = buildFormData(inquiry);
              return (
                <tr key={inquiry.id}>
                  <td>{new Date(inquiry.createdAt).toLocaleString()}</td>
                  <td>
                    <strong>{formName(inquiry)}</strong>
                  </td>
                  <td>
                    <div className="payload-inquiry-data-preview">{summarizeFormData(formData, inquiry.fieldLabels ?? {})}</div>
                  </td>
                  <td>
                    <InquiryDataDialog formData={formData} inquiry={inquiry} />
                  </td>
                </tr>
              );
            })}
            {inquiriesPage.total === 0 && (
              <tr>
                <td className="payload-empty-cell" colSpan={4}>
                  No inquiries found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AdminPagination
        basePath="/admin/inquiries"
        page={inquiriesPage.page}
        perPage={inquiriesPage.perPage}
        total={inquiriesPage.total}
      />
    </div>
  );
}

function buildFormData(inquiry: AdminInquiry): Record<string, unknown> {
  return {
    ...(inquiry.payload ?? {}),
    ...(inquiry.sourceUrl ? { sourceUrl: inquiry.sourceUrl } : {})
  };
}

function summarizeFormData(formData: Record<string, unknown>, labels: Record<string, string>) {
  const entries = Object.entries(formData).filter(([, value]) => value !== undefined && value !== null && value !== "");
  if (entries.length === 0) return "-";
  return entries
    .slice(0, 4)
    .map(([key, value]) => `${labels[key] ?? humanizeKey(key)}: ${formatValue(value)}`)
    .join(" · ");
}

function formName(inquiry: AdminInquiry) {
  return inquiry.subject || formatFormType(inquiry.formType);
}

function formatValue(value: unknown): string {
  if (Array.isArray(value)) return value.map(formatValue).join(", ");
  if (typeof value === "object" && value !== null) return JSON.stringify(value);
  return String(value);
}

function humanizeKey(value: string) {
  return value
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]+/g, " ")
    .replace(/^./, (char) => char.toUpperCase());
}

function formatFormType(value: string) {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
