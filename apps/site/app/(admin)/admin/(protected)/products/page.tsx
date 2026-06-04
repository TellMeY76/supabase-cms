import Link from "next/link";
import {
  deleteProductAction,
  updateProductStatusAction
} from "@/app/(admin)/admin/actions";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { RefreshButton } from "@/components/admin/RefreshButton";
import { SplitActionsTable } from "@/components/admin/SplitActionsTable";
import { listAdminProductCategories, listAdminProductsPage } from "@/lib/admin-data";

const perPage = 20;

export default async function AdminProductsPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; page?: string; success?: string }>;
}) {
  const { error, page: pageParam, success } = await searchParams;
  const [productsPage, categories] = await Promise.all([
    listAdminProductsPage({ page: pageParam, perPage }),
    listAdminProductCategories()
  ]);
  const products = productsPage.items;
  const categoriesById = new Map(categories.map((category) => [category.id, category]));
  const productRows = products.map((product) => {
    const productCategories = product.categoryIds
      .map((id) => {
        const category = categoriesById.get(id);
        return category?.displayTitle ?? category?.title;
      })
      .filter((title): title is string => Boolean(title));

    return {
      priceLabel: formatPrice(product),
      product,
      productCategories
    };
  });

  return (
    <div>
      <div className="payload-page-header">
        <div>
          <h1>Products</h1>
          <p>Create and edit product catalog entries.</p>
        </div>
        <div className="payload-page-actions">
          <RefreshButton />
          <Link className="payload-button" href="/admin/products/new">
            New Product
          </Link>
        </div>
      </div>

      {error && <div className="payload-alert payload-alert--danger">{error}</div>}
      {success && <div className="payload-alert payload-alert--success">{success}</div>}

      <SplitActionsTable className="payload-table-split--products">
        <div className="payload-table-split__scroll">
          <table className="payload-table payload-table--products">
            <thead>
              <tr>
                <th className="payload-thumb-column">Image</th>
                <th>Title</th>
                <th>SKU</th>
                <th>Stock</th>
                <th>Price</th>
                <th>Categories</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {productRows.map(({ priceLabel, product, productCategories }) => (
                <tr key={product.id}>
                  <td>
                    {product.primaryImage?.publicUrl ? (
                      <img className="payload-table-thumb payload-product-thumb" src={product.primaryImage.publicUrl} alt="" />
                    ) : (
                      <span className="payload-product-thumb payload-product-thumb--empty">No image</span>
                    )}
                  </td>
                  <td className="payload-title-column">
                    <div className="payload-title-cell">
                      <Link href={`/admin/products/${product.id}`}>{product.title}</Link>
                      <span>{product.source?.sourceId ? `ID: ${product.source.sourceId}` : product.slug}</span>
                    </div>
                  </td>
                  <td className="payload-nowrap">{product.sku || "-"}</td>
                  <td className="payload-nowrap">
                    <span className={product.stockStatus ? "payload-stock payload-stock--in" : "payload-muted"}>
                      {formatStock(product.stockStatus, product.stockQuantity)}
                    </span>
                  </td>
                  <td className="payload-nowrap">
                    <span className="payload-price-cell" title={priceLabel}>
                      {priceLabel}
                    </span>
                  </td>
                  <td className="payload-nowrap">
                    <span className="payload-categories-cell">
                      {productCategories.length > 0 ? productCategories.join(", ") : "Uncategorized"}
                    </span>
                  </td>
                  <td className="payload-nowrap">
                    <span className={`payload-status payload-status--${product.status}`}>{product.status}</span>
                  </td>
                  <td className="payload-nowrap">{new Date(product.updatedAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {productsPage.total === 0 && (
                <tr>
                  <td className="payload-empty-cell" colSpan={8}>
                    No products found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="payload-table-split__actions" aria-label="Product actions">
          <div className="payload-table-split__actions-head">Actions</div>
          {productRows.map(({ product }) => (
            <div className="payload-table-split__actions-row" key={product.id}>
              <div className="payload-table-actions">
                <Link className="payload-button payload-button--small" href={`/admin/products/${product.id}`}>
                  Edit
                </Link>
                {product.status !== "published" ? (
                  <form action={updateProductStatusAction} className="payload-inline-form">
                    <input name="id" type="hidden" value={product.id} />
                    <input name="status" type="hidden" value="published" />
                    <button className="payload-button payload-button--success payload-button--small" type="submit">
                      Publish
                    </button>
                  </form>
                ) : (
                  <form action={updateProductStatusAction} className="payload-inline-form">
                    <input name="id" type="hidden" value={product.id} />
                    <input name="status" type="hidden" value="draft" />
                    <button className="payload-button payload-button--ghost payload-button--small" type="submit">
                      Draft
                    </button>
                  </form>
                )}
                <form action={deleteProductAction}>
                  <input name="id" type="hidden" value={product.id} />
                  <button className="payload-button payload-button--danger payload-button--small" type="submit">
                    Delete
                  </button>
                </form>
              </div>
            </div>
          ))}
          {productsPage.total === 0 && <div className="payload-table-split__actions-row payload-table-split__actions-row--empty">-</div>}
        </div>
      </SplitActionsTable>
      <AdminPagination
        basePath="/admin/products"
        page={productsPage.page}
        perPage={productsPage.perPage}
        query={{ error, success }}
        total={productsPage.total}
      />
    </div>
  );
}

function formatPrice(product: {
  priceText?: string | undefined;
  regularPrice?: string | undefined;
  salePrice?: string | undefined;
  currency?: string | undefined;
}) {
  if (product.priceText) return formatImportedDisplayText(product.priceText);
  const price = product.salePrice || product.regularPrice;
  if (!price) return "-";
  const cleanPrice = formatImportedDisplayText(price);
  if (!cleanPrice) return "-";
  return product.currency ? `${product.currency} ${cleanPrice}` : cleanPrice;
}

function formatStock(stockStatus?: string, stockQuantity?: number) {
  if (!stockStatus) return "-";
  const label = stockStatus === "1" || stockStatus.toLowerCase() === "instock" ? "In stock" : stockStatus;
  return stockQuantity ? `${label} (${stockQuantity})` : label;
}

function formatImportedDisplayText(value: string) {
  return decodeHtmlEntities(
    value
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\\[rnt]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

function decodeHtmlEntities(value: string) {
  const namedEntities: Record<string, string> = {
    amp: "&",
    apos: "'",
    euro: "EUR",
    gt: ">",
    lt: "<",
    nbsp: " ",
    pound: "GBP",
    quot: "\"",
    yen: "JPY"
  };

  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&([a-z]+);/gi, (_, name: string) => namedEntities[name.toLowerCase()] ?? `&${name};`)
    .replace(/\s+/g, " ")
    .trim();
}
