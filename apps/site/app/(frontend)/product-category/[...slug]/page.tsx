import Link from "next/link";
import { ProductCard } from "@/components/ProductCard";
import { listCategories, listProducts } from "@/lib/data";
import { categoryPath, categoryTitle, descendantCategoryIds } from "@/lib/frontend-helpers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CategoryPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const categorySlug = slug.at(-1) ?? "";
  const [products, categories] = await Promise.all([listProducts(), listCategories()]);
  const category = categories.find((item) => item.slug === categorySlug);
  const categoryIds = category ? descendantCategoryIds(category.id, categories) : new Set<string>();
  const filteredProducts = category ? products.filter((product) => product.categoryIds.some((id) => categoryIds.has(id))) : products;
  const children = category ? categories.filter((item) => item.parentId === category.id) : categories.filter((item) => !item.parentId);

  return (
    <main>
      <section className="page-hero">
        <div className="shell">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-[#ffb36b]">Product Category</p>
          <h1>{category ? categoryTitle(category) : "Products"}</h1>
          <p>{category?.description ?? "Browse product catalog."}</p>
        </div>
      </section>
      <section className="inshow-section">
        <div className="shell product-category-page">
          {children.length > 0 && (
            <div className="mb-8 flex flex-wrap gap-3">
              {children.map((child) => (
                <Link className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-bold text-[#072941] hover:border-[#ff881b] hover:text-[#ff881b]" href={categoryPath(child, categories)} key={child.id}>
                  {categoryTitle(child)}
                </Link>
              ))}
            </div>
          )}
          <div className="products columns-3">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          {filteredProducts.length === 0 && (
            <div className="rounded-lg border border-zinc-200 bg-white p-10 text-center text-zinc-500">No products found in this category.</div>
          )}
        </div>
      </section>
    </main>
  );
}
