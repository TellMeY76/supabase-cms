import Link from "next/link";
import type { Product } from "@global-trade/core";
import { CategoryAccordion } from "@/components/CategoryAccordion";
import { ProductCard } from "@/components/ProductCard";
import { ProductListInquiryForm } from "@/components/ProductListInquiryForm";
import { ProductSortSelect, type ProductSortValue } from "@/components/ProductSortSelect";
import { listCategories, listProducts } from "@/lib/data";
import { categoryTitle, descendantCategoryIds } from "@/lib/frontend-helpers";
import { inshowAssets } from "@/lib/inshow-assets";

export const revalidate = 300;

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; page?: string; q?: string; sort?: string }>;
}) {
  const [{ category, page, q, sort }, products, categories] = await Promise.all([
    searchParams,
    listProducts(),
    listCategories(),
  ]);
  const sortValue = parseSortValue(sort);
  const term = (q ?? "").trim().toLowerCase();
  const selectedCategory = category ? categories.find((item) => item.slug === category) : undefined;
  const selectedCategoryIds = selectedCategory ? descendantCategoryIds(selectedCategory.id, categories) : undefined;
  const categoryFiltered = selectedCategoryIds
    ? products.filter((product) => product.categoryIds.some((id) => selectedCategoryIds.has(id)))
    : products;
  const filtered = term
    ? categoryFiltered.filter(product =>
        `${product.title} ${product.summary ?? ""} ${product.sku ?? ""}`
          .toLowerCase()
          .includes(term)
      )
    : categoryFiltered;
  const sortedProducts = sortProducts(filtered, sortValue);
  const perPage = 9;
  const totalPages = Math.max(1, Math.ceil(sortedProducts.length / perPage));
  const currentPage = Math.min(
    Math.max(Number.parseInt(page ?? "1", 10) || 1, 1),
    totalPages
  );
  const pageStart = (currentPage - 1) * perPage;
  const pageProducts = sortedProducts.slice(pageStart, pageStart + perPage);
  const showingStart = sortedProducts.length ? pageStart + 1 : 0;
  const showingEnd = Math.min(pageStart + perPage, sortedProducts.length);
  const latestProducts = products.slice(0, 4);

  return (
    <main>
      <section className="product-list-container">
        <section className="featured-products">
          <div className="featured-col-lg">
            <img src={inshowAssets.featuredProductOne} alt="Time to flourish" />
            <div className="featured-col-lg_info">
              <h3>Time to flourish</h3>
              <p>Spring your space to life with small shifts &amp; big</p>
              <Link className="detail-btn" href="/products">
                Details
              </Link>
            </div>
          </div>
          <div className="featured-col-sm">
            <img src={inshowAssets.featuredProductTwo} alt="Time to flourish" />
          </div>
        </section>

        <div className="product-content-block">
          <aside className="left-columns">
            <div className="product-content-category">
              <CategoryAccordion categories={categories} selectedSlug={selectedCategory?.slug} />
            </div>
            <div className="latest-products">
              <h2 className="latest-products-title">Latest Products</h2>
              <ul className="latest-products-list">
                {latestProducts.map(product => (
                  <li className="latest-products-item" key={product.id}>
                    <Link
                      className="latest-products-item_link"
                      href={`/products/${product.slug}`}
                    >
                      <span className="product-thumbnail">
                        {product.primaryImage?.publicUrl && (
                          <img
                            src={product.primaryImage.publicUrl}
                            alt={product.title}
                          />
                        )}
                      </span>
                      <span className="product-info">
                        <h3>{product.title}</h3>
                        <p>
                          {product.summary ??
                            "Product details and specifications"}
                        </p>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
          <div className="product-content-list">
            <div className="product-list-heading">
              <p>
                Showing {showingStart}-{showingEnd} of {sortedProducts.length} results
                {selectedCategory ? ` in ${categoryTitle(selectedCategory)}` : ""}
              </p>
              <ProductSortSelect value={sortValue} />
            </div>
            <div className="products columns-3">
              {pageProducts.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
            {totalPages > 1 && (
              <ProductPagination
                currentPage={currentPage}
                totalPages={totalPages}
                category={selectedCategory?.slug}
                q={q}
                sort={sortValue}
              />
            )}
          </div>
        </div>
      </section>
      <section className="product-applications-section">
        <h2>Light Steel House Construction Applications</h2>
        <div className="product-application-grid">
          {[
            [
              "Residential Construction:",
              "LGS buildings are popular for constructing modern homes, multi-story apartments, and housing developments due to their strength, design flexibility, and rapid construction.",
            ],
            [
              "Commercial Spaces:",
              "From office buildings to retail outlets, LGS structures offer efficient and adaptable spaces for businesses, allowing for customized layouts and quick occupancy.",
            ],
            [
              "Industrial Applications:",
              "Factories, warehouses, and industrial facilities benefit from the durability and cost-effectiveness of LGS construction, meeting the demands of robust and functional structures.",
            ],
            [
              "Institutional Buildings:",
              "Schools, healthcare facilities, and other public buildings can utilize LGS construction for its ability to create safe, durable, and customized spaces for diverse purposes.",
            ],
          ].map(([title, text], index) => (
            <article className="product-application-card" key={title}>
              <div className="product-application-card__img-box" >
                <img
                  src={
                    [
                      inshowAssets.detailIconOne,
                      inshowAssets.detailIconTwo,
                      inshowAssets.detailIconThree,
                      inshowAssets.detailIconFour,
                    ][index]
                  }
                  alt=""
                />
              </div>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="product-list-support-section">
        <h2>Contact Customer Support</h2>
        <p>
          If you are in need of immediate assistance, you can reach us at
          +18002208056.
        </p>
        <ProductListInquiryForm />
      </section>
    </main>
  );
}

function ProductPagination({
  currentPage,
  totalPages,
  category,
  q,
  sort,
}: {
  currentPage: number;
  totalPages: number;
  category?: string | undefined;
  q: string | undefined;
  sort: ProductSortValue;
}) {
  const pages = buildPagination(currentPage, totalPages);

  return (
    <nav className="product-pagination" aria-label="Products pagination">
      {pages.map((item, index) =>
        item === "gap" ? (
          <span key={`gap-${index}`}>...</span>
        ) : (
          <Link
            className={item === currentPage ? "is-active" : undefined}
            href={productPageHref(item, category, q, sort)}
            key={item}
          >
            {item}
          </Link>
        )
      )}
      {currentPage < totalPages && (
        <Link href={productPageHref(currentPage + 1, category, q, sort)}>→</Link>
      )}
    </nav>
  );
}

function productPageHref(page: number, category: string | undefined, q: string | undefined, sort: ProductSortValue) {
  const params = new URLSearchParams();
  if (page > 1) params.set("page", String(page));
  if (category) params.set("category", category);
  if (q) params.set("q", q);
  if (sort !== "default") params.set("sort", sort);
  const query = params.toString();
  return query ? `/products?${query}` : "/products";
}

function parseSortValue(value: string | undefined): ProductSortValue {
  if (value === "popularity" || value === "latest" || value === "price-asc" || value === "price-desc") return value;
  return "default";
}

function sortProducts(products: Product[], sort: ProductSortValue) {
  const sorted = [...products];
  if (sort === "latest") {
    return sorted.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  }
  if (sort === "price-asc") {
    return sorted.sort((a, b) => productPrice(a) - productPrice(b));
  }
  if (sort === "price-desc") {
    return sorted.sort((a, b) => productPrice(b) - productPrice(a));
  }
  if (sort === "popularity") {
    return sorted.sort((a, b) => productPopularity(b) - productPopularity(a));
  }
  return sorted;
}

function productPrice(product: Product) {
  const price = product.salePrice || product.regularPrice || product.priceText || "";
  const numeric = Number.parseFloat(String(price).replace(/[^0-9.]+/g, ""));
  return Number.isFinite(numeric) ? numeric : Number.MAX_SAFE_INTEGER;
}

function productPopularity(product: Product) {
  const hasImage = product.primaryImage?.publicUrl ? 100 : 0;
  const galleryScore = Math.min(product.gallery?.length ?? 0, 8) * 5;
  const contentScore = Math.min((product.summary?.length ?? 0) + product.richText.length, 1000) / 50;
  const specScore = Math.min(product.specifications.length, 12) * 2;
  const recencyScore = Number.isFinite(Date.parse(product.updatedAt)) ? Date.parse(product.updatedAt) / 100000000000 : 0;
  return hasImage + galleryScore + contentScore + specScore + recencyScore;
}

function buildPagination(currentPage: number, totalPages: number) {
  if (totalPages <= 7)
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  const pages: Array<number | "gap"> = [1, 2, 3, 4];
  if (currentPage > 5 && currentPage < totalPages - 3)
    pages.push("gap", currentPage);
  pages.push("gap", totalPages - 2, totalPages - 1, totalPages);
  const seen = new Set<number>();
  return pages.filter(item => {
    if (item === "gap") return true;
    if (seen.has(item)) return false;
    seen.add(item);
    return item >= 1 && item <= totalPages;
  });
}
