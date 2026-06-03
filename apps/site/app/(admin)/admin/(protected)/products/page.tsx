import Link from "next/link";
import {
  deleteProductAction,
  updateProductStatusAction
} from "@/app/(admin)/admin/actions";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { RefreshButton } from "@/components/admin/RefreshButton";
import { listAdminProductCategories, listAdminProducts } from "@/lib/admin-data";

export default async function AdminProductsPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; page?: string; success?: string }>;
}) {
  const [{ error, page: pageParam, success }, products, categories] = await Promise.all([
    searchParams,
    listAdminProducts(),
    listAdminProductCategories()
  ]);
  const perPage = 20;
  const page = clampPage(pageParam, products.length, perPage);
  const pagedProducts = products.slice((page - 1) * perPage, page * perPage);
  const categoriesById = new Map(categories.map((category) => [category.id, category]));

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

      <div className="payload-table-wrap payload-table-wrap--sticky-actions">
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
              <th className="payload-actions-column">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pagedProducts.map((product) => {
              const productCategories = product.categoryIds
                .map((id) => categoriesById.get(id)?.displayTitle ?? categoriesById.get(id)?.title)
                .filter(Boolean);

              return (
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
                  <td className="payload-nowrap">{formatPrice(product)}</td>
                  <td className="payload-nowrap">
                    <span className="payload-categories-cell">
                      {productCategories.length > 0 ? productCategories.join(", ") : "Uncategorized"}
                    </span>
                  </td>
                  <td className="payload-nowrap">
                    <span className={`payload-status payload-status--${product.status}`}>{product.status}</span>
                  </td>
                  <td className="payload-nowrap">{new Date(product.updatedAt).toLocaleDateString()}</td>
                  <td className="payload-actions-column">
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
                  </td>
                </tr>
              );
            })}
            {products.length === 0 && (
              <tr>
                <td className="payload-empty-cell" colSpan={9}>
                  No products found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <AdminPagination
        basePath="/admin/products"
        page={page}
        perPage={perPage}
        query={{ error, success }}
        total={products.length}
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
  if (product.priceText) return product.priceText;
  const price = product.salePrice || product.regularPrice;
  if (!price) return "-";
  return product.currency ? `${product.currency} ${price}` : price;
}

function formatStock(stockStatus?: string, stockQuantity?: number) {
  if (!stockStatus) return "-";
  const label = stockStatus === "1" || stockStatus.toLowerCase() === "instock" ? "In stock" : stockStatus;
  return stockQuantity ? `${label} (${stockQuantity})` : label;
}

function clampPage(pageParam: string | undefined, total: number, perPage: number) {
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const page = Number(pageParam ?? "1");
  if (!Number.isFinite(page)) return 1;
  return Math.min(Math.max(Math.floor(page), 1), totalPages);
}
