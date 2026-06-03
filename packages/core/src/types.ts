export type LocaleCode = "en" | "zh" | string;
export type MediaUploadProvider = "supabase" | "ali_oss";
export type I18nRoutingStrategy = "none" | "path-prefix";

export type UserRole = "owner" | "admin" | "editor" | "sales" | "viewer";

export type PublishStatus = "draft" | "published" | "archived";

export type InquiryStatus = "new" | "contacted" | "closed" | "spam";

export type FieldKind =
  | "text"
  | "textarea"
  | "number"
  | "boolean"
  | "date"
  | "url"
  | "select"
  | "multiSelect"
  | "json";

export interface SeoFields {
  title?: string | undefined;
  description?: string | undefined;
  canonicalUrl?: string | undefined;
  ogImageUrl?: string | undefined;
  noindex?: boolean | undefined;
}

export interface FixedPageSeo {
  home?: SeoFields | undefined;
  products?: SeoFields | undefined;
  news?: SeoFields | undefined;
  contact?: SeoFields | undefined;
}

export interface NavigationItem {
  label: string;
  href: string;
  children?: NavigationItem[] | undefined;
}

export interface FooterColumn {
  title: string;
  links: NavigationItem[];
}

export interface LocaleConfig {
  code: LocaleCode;
  label: string;
  enabled: boolean;
}

export interface I18nConfig {
  defaultLocale: LocaleCode;
  fallbackLocale?: LocaleCode | undefined;
  locales: LocaleConfig[];
  routingStrategy: I18nRoutingStrategy;
}

export interface AliOssPublicConfig {
  bucket?: string | undefined;
  region?: string | undefined;
  endpoint?: string | undefined;
  publicBaseUrl?: string | undefined;
  pathPrefix?: string | undefined;
}

export interface MediaStorageConfig {
  uploadProvider: MediaUploadProvider;
  supabaseBucket?: string | undefined;
  aliOss?: AliOssPublicConfig | undefined;
}

export interface SiteConfig {
  name: string;
  domain: string;
  locale: LocaleCode;
  logoUrl?: string | undefined;
  inquiryEmail: string;
  inquiryPhone?: string | undefined;
  inquiryWhatsApp?: string | undefined;
  inquiryWeChat?: string | undefined;
  defaultSeo: Required<Pick<SeoFields, "title" | "description">> & Partial<SeoFields>;
  pageSeo?: FixedPageSeo | undefined;
  navigation: NavigationItem[];
  footer: FooterColumn[];
  i18n?: I18nConfig | undefined;
  media?: MediaStorageConfig | undefined;
}

export interface CustomFieldConfig {
  name: string;
  label: string;
  kind: FieldKind;
  required?: boolean | undefined;
  options?: string[] | undefined;
}

export interface ContentModelConfig {
  products: boolean;
  posts: boolean;
  pages: boolean;
  inquiries: boolean;
  customFields?: {
    products?: CustomFieldConfig[] | undefined;
    posts?: CustomFieldConfig[] | undefined;
    pages?: CustomFieldConfig[] | undefined;
    inquiries?: CustomFieldConfig[] | undefined;
  } | undefined;
}

export interface MediaAsset {
  id: string;
  kind?: "remote" | "local" | undefined;
  sourceUrl?: string | undefined;
  storagePath: string;
  publicUrl: string;
  alt?: string | undefined;
  title?: string | undefined;
  caption?: string | undefined;
  mimeType?: string | undefined;
  width?: number | undefined;
  height?: number | undefined;
  source?: SourceIdentity | undefined;
}

export interface ProductSpecification {
  name: string;
  value: string;
  group?: string | undefined;
}

export interface ProductCategory {
  id: string;
  slug: string;
  title: string;
  displayTitle?: string | undefined;
  description?: string | undefined;
  parentId?: string | undefined;
  image?: MediaAsset | undefined;
  seo?: SeoFields | undefined;
  source?: SourceIdentity | undefined;
}

export interface ProductTag {
  id: string;
  slug: string;
  title: string;
  source?: SourceIdentity | undefined;
}

export interface Product {
  id: string;
  slug: string;
  title: string;
  status: PublishStatus;
  sku?: string | undefined;
  productType?: string | undefined;
  summary?: string | undefined;
  richText: string;
  legacyHtml?: string | undefined;
  categoryIds: string[];
  tagIds?: string[] | undefined;
  primaryImage?: MediaAsset | undefined;
  gallery?: MediaAsset[] | undefined;
  specifications: ProductSpecification[];
  regularPrice?: string | undefined;
  salePrice?: string | undefined;
  currency?: string | undefined;
  priceText?: string | undefined;
  stockStatus?: string | undefined;
  stockQuantity?: number | undefined;
  legacyMeta?: Record<string, unknown> | undefined;
  seo?: SeoFields | undefined;
  source?: SourceIdentity | undefined;
  updatedAt: string;
}

export interface PostCategory {
  id: string;
  slug: string;
  title: string;
  parentId?: string | undefined;
  source?: SourceIdentity | undefined;
}

export interface PostTag {
  id: string;
  slug: string;
  title: string;
  source?: SourceIdentity | undefined;
}

export interface Post {
  id: string;
  slug: string;
  title: string;
  status: PublishStatus;
  author?: string | undefined;
  excerpt?: string | undefined;
  richText: string;
  publishedAt?: string | undefined;
  modifiedAt?: string | undefined;
  categoryIds?: string[] | undefined;
  tagIds?: string[] | undefined;
  featuredImage?: MediaAsset | undefined;
  seo?: SeoFields | undefined;
  source?: SourceIdentity | undefined;
  updatedAt: string;
}

export interface Page {
  id: string;
  slug: string;
  title: string;
  status: PublishStatus;
  richText: string;
  seo?: SeoFields | undefined;
  source?: SourceIdentity | undefined;
  updatedAt: string;
}

export interface Inquiry {
  id: string;
  status: InquiryStatus;
  formType: string;
  subject?: string | undefined;
  name: string;
  email: string;
  phone?: string | undefined;
  messenger?: string | undefined;
  company?: string | undefined;
  message: string;
  productId?: string | undefined;
  sourceUrl?: string | undefined;
  payload?: Record<string, unknown> | undefined;
  fieldLabels?: Record<string, string> | undefined;
  metadata?: Record<string, unknown> | undefined;
  createdAt: string;
  updatedAt?: string | undefined;
}

export interface SourceIdentity {
  siteUrl: string;
  sourceType: string;
  sourceId: string;
  sourceSlug?: string | undefined;
  sourceUrl?: string | undefined;
}
