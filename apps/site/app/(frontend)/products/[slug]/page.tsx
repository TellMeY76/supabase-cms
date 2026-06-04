import { createMetadata, createProductJsonLd } from "@global-trade/core";
import type { MediaAsset } from "@global-trade/core";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChatNowDialog } from "@/components/ChatNowDialog";
import { InquiryForm } from "@/components/InquiryForm";
import { ProductGallery } from "@/components/ProductGallery";
import { getProduct } from "@/lib/data";
import { getRuntimeSiteConfig } from "@/lib/site-config";

export const revalidate = 300;

function normalizeSummaryHtml(summary?: string | null) {
  if (!summary) return "";
  return summary.replace(/\\n/g, "\n").replace(/\\"/g, '"').trim();
}

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
  const [product, siteConfig] = await Promise.all([getProduct(slug), getRuntimeSiteConfig()]);
  if (!product) notFound();
  const images = [product.primaryImage, ...(product.gallery ?? [])].filter((image): image is MediaAsset => Boolean(image?.publicUrl));
  const summaryHtml = normalizeSummaryHtml(product.summary);

  return (
    <main className="single-product">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(createProductJsonLd(siteConfig, product)) }} />
      <section className="single-product-main">
        <div className="inshow-product-page row">
          <div className="product-gallery-col">
            <ProductGallery images={images} title={product.title} />
          </div>
          <div className="product-summary-col">
            <h1 className="product_title">{product.title}</h1>
            {summaryHtml ? <div className="single-product-summary" dangerouslySetInnerHTML={{ __html: summaryHtml }} /> : null}
            <div className="product-custom-buttons">
              <a className="button" href="#inquiry">
                Send Inquiry
              </a>
              <ChatNowDialog />
            </div>
          </div>
        </div>
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
        <div className="product-description-tab">Description</div>
        <div className="single-product-content-grid">
          <article className="rich-text" dangerouslySetInnerHTML={{ __html: product.richText }} />
        </div>
        <div id="inquiry" className="product-contact-form">
          <h2>Contact Customer Support</h2>
          <p>If you are in need of immediate assistance, you can reach us at +18002208056.</p>
          <InquiryForm formType="product_inquiry" productId={product.id} sourceUrl={`/products/${product.slug}`} />
        </div>
      </section>
    </main>
  );
}
