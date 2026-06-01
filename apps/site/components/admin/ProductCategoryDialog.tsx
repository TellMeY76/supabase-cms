"use client";

import type { ReactNode } from "react";
import type { ProductCategory } from "@global-trade/core";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ProductCategoryForm } from "./ProductCategoryForm";

export function ProductCategoryDialog({
  buttonLabel,
  buttonClassName = "payload-button payload-button--small",
  buttonIcon,
  category,
  categories,
  defaultParentId,
  title,
}: {
  buttonLabel: string;
  buttonClassName?: string;
  buttonIcon?: ReactNode;
  category?: Partial<ProductCategory>;
  categories: ProductCategory[];
  defaultParentId?: string;
  title: string;
}) {
  return (
    <Dialog>
      <DialogTrigger className={buttonClassName} type="button">
        {buttonIcon}
        {buttonLabel}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <ProductCategoryForm
          {...(category ? { category } : {})}
          categories={categories}
          {...(defaultParentId ? { defaultParentId } : {})}
          compact
          submitLabel={category?.id ? "Save category" : "Create category"}
        />
      </DialogContent>
    </Dialog>
  );
}
