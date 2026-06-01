import Link from "next/link";
import type { ReactNode } from "react";

export function AdminPagination({
  basePath,
  page,
  perPage,
  total,
  query = {},
}: {
  basePath: string;
  page: number;
  perPage: number;
  total: number;
  query?: Record<string, string | undefined>;
}) {
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  if (totalPages <= 1) return null;

  return (
    <nav className="payload-pagination" aria-label="Pagination">
      <span>
        Page {page} of {totalPages} · {total} total
      </span>
      <div>
        <PaginationLink basePath={basePath} disabled={page <= 1} page={page - 1} query={query}>
          Previous
        </PaginationLink>
        {pageNumbers(page, totalPages).map((item, index) =>
          item === "gap" ? (
            <span className="payload-pagination-gap" key={`gap-${index}`}>...</span>
          ) : (
            <PaginationLink
              active={item === page}
              basePath={basePath}
              key={item}
              page={item}
              query={query}
            >
              {item}
            </PaginationLink>
          )
        )}
        <PaginationLink basePath={basePath} disabled={page >= totalPages} page={page + 1} query={query}>
          Next
        </PaginationLink>
      </div>
    </nav>
  );
}

function PaginationLink({
  active,
  basePath,
  children,
  disabled,
  page,
  query,
}: {
  active?: boolean;
  basePath: string;
  children: ReactNode;
  disabled?: boolean;
  page: number;
  query: Record<string, string | undefined>;
}) {
  const href = buildHref(basePath, { ...query, page: String(page) });
  if (disabled) return <span className="payload-button payload-button--small payload-button--ghost is-disabled">{children}</span>;
  return (
    <Link className={`payload-button payload-button--small ${active ? "" : "payload-button--ghost"}`} href={href}>
      {children}
    </Link>
  );
}

function buildHref(basePath: string, query: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value) params.set(key, value);
  }
  const search = params.toString();
  return search ? `${basePath}?${search}` : basePath;
}

function pageNumbers(page: number, totalPages: number): Array<number | "gap"> {
  const pages = new Set([1, totalPages, page - 1, page, page + 1].filter((item) => item >= 1 && item <= totalPages));
  const sorted = [...pages].sort((a, b) => a - b);
  const result: Array<number | "gap"> = [];
  for (const item of sorted) {
    const prev = result.at(-1);
    if (typeof prev === "number" && item - prev > 1) result.push("gap");
    result.push(item);
  }
  return result;
}
