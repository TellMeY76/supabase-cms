import Link from "next/link";
import { ProductCard } from "@/components/ProductCard";
import { listCategories, listProducts } from "@/lib/data";
import { categoryPath, categoryTitle } from "@/lib/frontend-helpers";
import { inshowAssets } from "@/lib/inshow-assets";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ProductsPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const [{ q }, products, categories] = await Promise.all([searchParams, listProducts(), listCategories()]);
  const term = (q ?? "").trim().toLowerCase();
  const filtered = term
    ? products.filter((product) => `${product.title} ${product.summary ?? ""} ${product.sku ?? ""}`.toLowerCase().includes(term))
    : products;

  return (
    <main>
      <section className="product-list-container">
        <section className="featured-products">
          <div className="featured-col-lg">
            <img src={inshowAssets.featuredProductOne} alt="Time to flourish" />
            <div className="featured-col-lg_info">
              <h3>Time to flourish</h3>
              <p>Spring your space to life with small shifts &amp; big</p>
              <Link className="detail-btn" href="/products">Details</Link>
            </div>
          </div>
          <div className="featured-col-sm">
            <img src={inshowAssets.featuredProductTwo} alt="Time to flourish" />
          </div>
        </section>

        <div className="product-content-block">
          <aside className="left-columns">
            <div className="product-content-category">
              <ul id="category-accordion">
                {categories.filter((category) => !category.parentId).map((category) => {
                  const children = categories.filter((item) => item.parentId === category.id);
                  return (
                    <li className={`category-item level-0 ${children.length ? "has-children selected" : ""}`} key={category.id}>
                      <Link className="category-header" href={categoryPath(category, categories)}>
                        {category.image?.publicUrl && <img src={category.image.publicUrl} alt={categoryTitle(category)} />}
                        <span className="category-header-text"><span>{categoryTitle(category)}</span></span>
                      </Link>
                      {children.length > 0 && (
                        <ul className="subcategory-list">
                          {children.map((child) => (
                            <li className="category-item level-1" key={child.id}>
                              <Link className="category-header" href={categoryPath(child, categories)}>
                                {child.image?.publicUrl && <img src={child.image.publicUrl} alt={categoryTitle(child)} />}
                                <span className="category-header-text"><span>{categoryTitle(child)}</span></span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="latest-products">
              <h2 className="latest-products-title">Latest Products</h2>
              <ul className="latest-products-list">
                {products.slice(0, 3).map((product) => (
                  <li className="latest-products-item" key={product.id}>
                    <Link className="latest-products-item_link" href={`/products/${product.slug}`}>
                      <span className="product-thumbnail">
                        {product.primaryImage?.publicUrl && <img src={product.primaryImage.publicUrl} alt={product.title} />}
                      </span>
                      <span className="product-info">
                        <h3>{product.title}</h3>
                        <p>{product.summary ?? "Product details and specifications"}</p>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
          <div className="product-content-list">
            <div className="product-list-heading">
              <h1>{term ? `Search: ${q}` : "Products"}</h1>
              <form className="product-list-search">
                <input name="q" placeholder="Search products" defaultValue={q ?? ""} />
                <button type="submit">Search</button>
              </form>
            </div>
            <div className="products columns-3">
              {filtered.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
