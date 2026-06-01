import type { Product } from "@global-trade/core";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function ProductCard({ product }: { product: Product }) {
  const imageUrl = product.primaryImage?.publicUrl ?? product.gallery?.[0]?.publicUrl;
  const excerpt = product.summary ?? stripHtml(product.richText).slice(0, 160);

  return (
    <article className="product type-product">
      <div className="list-product-layout">
        <Link className="custom-product-link" href={`/products/${product.slug}`}>
          <div className="product-image">
            {imageUrl ? (
              <img src={imageUrl} alt={product.primaryImage?.alt ?? product.title} />
            ) : (
              <div className="product-image-placeholder">INSHOW HOME</div>
            )}
          </div>
          <div className="product-details">
            <h2 className="woocommerce-loop-product__title">{product.title}</h2>
            <div className="product-description">{excerpt || "Customizable product solutions for global project buyers."}</div>
          </div>
          <div className="product-btns">
            <span className="product-btn detail">
              Details <ArrowRight size={14} />
            </span>
          </div>
        </Link>
      </div>
    </article>
  );
}

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
