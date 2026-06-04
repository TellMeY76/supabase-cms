"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export type ProductSortValue = "default" | "popularity" | "latest" | "price-asc" | "price-desc";

export function ProductSortSelect({ value }: { value: ProductSortValue }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  return (
    <select
      aria-label="Product sorting"
      className={`product-sort-select ${isPending ? "is-pending" : ""}`}
      disabled={isPending}
      onChange={(event) => {
        const params = new URLSearchParams(searchParams.toString());
        const nextValue = event.target.value;
        params.delete("page");
        if (nextValue === "default") {
          params.delete("sort");
        } else {
          params.set("sort", nextValue);
        }
        const query = params.toString();
        startTransition(() => {
          router.push(query ? `${pathname}?${query}` : pathname);
        });
      }}
      value={value}
    >
      <option value="default">Default sorting</option>
      <option value="popularity">Sort by popularity</option>
      <option value="latest">Sort by latest</option>
      <option value="price-asc">Sort by price: low to high</option>
      <option value="price-desc">Sort by price: high to low</option>
    </select>
  );
}
