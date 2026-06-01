import { createMetadata, createProductJsonLd } from "@global-trade/core";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InquiryForm } from "@/components/InquiryForm";
import { getProduct, listCategories } from "@/lib/data";
import { categoryPath, categoryTitle } from "@/lib/frontend-helpers";
import { inshowAssets } from "@/lib/inshow-assets";
import { getRuntimeSiteConfig } from "@/lib/site-config";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const [product, siteConfig] = await Promise.all([getProduct(slug), getRuntimeSiteConfig()]);
  if (!product) return {};
  const metadata = createMetadata(siteConfig, product.seo, `/products/${product.slug}`);
  return {
    title: metadata.title,
    description: metadata.description,
    alternates: { canonical: metadata.canonicalUrl },
    robots: metadata.robots,
    openGraph: metadata.openGraph
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [product, siteConfig, categories] = await Promise.all([getProduct(slug), getRuntimeSiteConfig(), listCategories()]);
  if (!product) notFound();
  const images = [product.primaryImage, ...(product.gallery ?? [])].filter(Boolean);
  const categoryLinks = product.categoryIds.flatMap((id) => {
    const category = categories.find((item) => item.id === id);
    return category ? [category] : [];
  });

  return (
    <main className="single-product">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(createProductJsonLd(siteConfig, product)) }} />
      <section className="single-product-main">
        <div className="inshow-product-page row">
          <div className="product-gallery-col">
            <div className="product-main-image">
              {images[0]?.publicUrl ? (
                <img src={images[0].publicUrl} alt={images[0].alt ?? product.title} />
              ) : (
                <div className="product-image-placeholder">INSHOW HOME</div>
              )}
            </div>
            {images.length > 1 && (
              <div className="product-thumbnail-grid">
                {images.slice(1, 9).map((image, index) => (
                  <img src={image?.publicUrl} alt={image?.alt ?? `${product.title} ${index + 1}`} key={`${image?.publicUrl}-${index}`} />
                ))}
              </div>
            )}
          </div>
          <div className="product-summary-col">
            <h1 className="product_title">{product.title}</h1>
            <p className="product-sku">SKU: {product.sku || "-"}</p>
            {product.summary ? <p className="single-product-summary">{product.summary}</p> : null}
            <div className="single-product-cats">
              {categoryLinks.map((category) => (
                <Link href={categoryPath(category, categories)} key={category.id}>
                  {categoryTitle(category)}
                </Link>
              ))}
            </div>
            <div className="single-product-meta">
              <div>
                <span>Price</span>
                <strong>{product.priceText || product.salePrice || product.regularPrice || "Contact us"}</strong>
              </div>
              <div>
                <span>Stock</span>
                <strong>{product.stockStatus || "In stock"}</strong>
              </div>
            </div>
            <div className="product-custom-buttons">
              <a className="button" href="#inquiry">
                Send Inquiry
              </a>
              <a className="button button-outline" href="/contact">
                Chat Now
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="single-product-contact-info">
        {[
          ["All Products", "Complete catalog sourcing", inshowAssets.detailIconOne],
          ["Quality Control", "Factory and supply chain coordination", inshowAssets.detailIconTwo],
          ["Global Delivery", "Project-oriented export service", inshowAssets.detailIconThree],
          ["Inquiry First", "Fast quotation and details", inshowAssets.detailIconFour]
        ].map(([title, text, icon]) => (
          <div className="single-product-info-card" key={title}>
            <img src={icon} alt="" />
            <div>
              <strong>{title}</strong>
              <span>{text}</span>
            </div>
          </div>
        ))}
      </section>

      {product.specifications.length > 0 && (
        <section className="single-product-section">
          <div className="single-product-container">
            <div className="inshow-section-header">
              <h2>Specifications</h2>
              <p>Imported key attributes are kept structured for AI-generated frontend sections.</p>
            </div>
            <div className="rich-text single-product-table">
              <table>
                <tbody>
                  {product.specifications.map((spec) => (
                    <tr key={`${spec.group}-${spec.name}`}>
                      <th>{spec.name}</th>
                      <td>{spec.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      <section className="product-description-and-tabs">
        <div className="single-product-content-grid">
          <article className="rich-text" dangerouslySetInnerHTML={{ __html: product.richText }} />
          <aside id="inquiry" className="product-contact-form">
            <h2>Send Inquiry</h2>
            <p>Tell us your quantity, size, material and project requirements.</p>
            <div>
              <InquiryForm formType="product_inquiry" productId={product.id} sourceUrl={`/products/${product.slug}`} />
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
