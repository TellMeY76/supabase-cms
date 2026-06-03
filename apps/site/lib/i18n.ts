import type { I18nConfig, LocaleCode, SiteConfig } from "@global-trade/core";

export const defaultI18nConfig: I18nConfig = {
  defaultLocale: "en",
  fallbackLocale: "en",
  routingStrategy: "none",
  locales: [{ code: "en", label: "English", enabled: true }]
};

export function getI18nConfig(config?: Pick<SiteConfig, "i18n" | "locale">): I18nConfig {
  return {
    ...defaultI18nConfig,
    defaultLocale: config?.i18n?.defaultLocale ?? config?.locale ?? defaultI18nConfig.defaultLocale,
    fallbackLocale: config?.i18n?.fallbackLocale ?? config?.i18n?.defaultLocale ?? config?.locale ?? defaultI18nConfig.fallbackLocale,
    routingStrategy: config?.i18n?.routingStrategy ?? defaultI18nConfig.routingStrategy,
    locales: config?.i18n?.locales?.length ? config.i18n.locales : defaultI18nConfig.locales
  };
}

export function enabledLocales(config?: Pick<SiteConfig, "i18n" | "locale">): LocaleCode[] {
  return getI18nConfig(config)
    .locales.filter((locale) => locale.enabled)
    .map((locale) => locale.code);
}

export function normalizeLocale(locale: string | null | undefined, config?: Pick<SiteConfig, "i18n" | "locale">): LocaleCode {
  const i18n = getI18nConfig(config);
  if (!locale) return i18n.defaultLocale;
  return enabledLocales(config).includes(locale) ? locale : i18n.fallbackLocale ?? i18n.defaultLocale;
}

export function getLocaleFromPathname(pathname: string, config?: Pick<SiteConfig, "i18n" | "locale">): LocaleCode {
  const i18n = getI18nConfig(config);
  if (i18n.routingStrategy !== "path-prefix") return i18n.defaultLocale;
  const firstSegment = pathname.split("/").filter(Boolean)[0];
  return normalizeLocale(firstSegment, config);
}

export function withLocalePrefix(pathname: string, locale: LocaleCode, config?: Pick<SiteConfig, "i18n" | "locale">): string {
  const i18n = getI18nConfig(config);
  if (i18n.routingStrategy !== "path-prefix" || locale === i18n.defaultLocale) return pathname;
  return `/${locale}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
}

export function pickLocalizedValue<T>(
  value: T | Partial<Record<LocaleCode, T>> | null | undefined,
  locale: LocaleCode,
  fallbackLocale = "en"
): T | undefined {
  if (!value) return undefined;
  if (typeof value !== "object" || Array.isArray(value)) return value as T;
  const localized = value as Partial<Record<LocaleCode, T>>;
  return localized[locale] ?? localized[fallbackLocale] ?? Object.values(localized)[0];
}
