import { saveSettingsAction } from "@/app/(admin)/admin/actions";
import { getRuntimeSiteConfig } from "@/lib/site-config";

export default async function SettingsPage() {
  const config = await getRuntimeSiteConfig();
  const i18n = config.i18n ?? {
    defaultLocale: config.locale,
    fallbackLocale: config.locale,
    routingStrategy: "none",
    locales: [{ code: config.locale, label: config.locale.toUpperCase(), enabled: true }]
  };
  const enabledLocales = i18n.locales
    .filter((locale) => locale.enabled)
    .map((locale) => locale.code)
    .join(", ");

  return (
    <div>
      <h1>Settings</h1>
      <form action={saveSettingsAction} className="payload-form">
        <section className="payload-form-section">
          <h2>Site</h2>
          <div className="payload-field-grid">
            <div className="payload-field">
              <label htmlFor="name">Site name</label>
              <input id="name" name="name" required defaultValue={config.name} />
            </div>
            <div className="payload-field">
              <label htmlFor="domain">Domain</label>
              <input id="domain" name="domain" required defaultValue={config.domain} />
            </div>
            <div className="payload-field">
              <label htmlFor="locale">Locale</label>
              <input id="locale" name="locale" required defaultValue={config.locale} />
            </div>
            <div className="payload-field">
              <label htmlFor="inquiryEmail">Inquiry email</label>
              <input id="inquiryEmail" name="inquiryEmail" type="email" required defaultValue={config.inquiryEmail} />
            </div>
            <div className="payload-field">
              <label htmlFor="inquiryPhone">Phone</label>
              <input id="inquiryPhone" name="inquiryPhone" defaultValue={config.inquiryPhone ?? ""} />
            </div>
            <div className="payload-field">
              <label htmlFor="inquiryWhatsApp">WhatsApp</label>
              <input id="inquiryWhatsApp" name="inquiryWhatsApp" defaultValue={config.inquiryWhatsApp ?? ""} />
            </div>
            <div className="payload-field">
              <label htmlFor="inquiryWeChat">WeChat</label>
              <input id="inquiryWeChat" name="inquiryWeChat" defaultValue={config.inquiryWeChat ?? ""} />
            </div>
          </div>
        </section>
        <section className="payload-form-section">
          <h2>Default SEO</h2>
          <div className="payload-field">
            <label htmlFor="defaultSeoTitle">Title</label>
            <input id="defaultSeoTitle" name="defaultSeoTitle" required defaultValue={config.defaultSeo.title} />
          </div>
          <div className="payload-field">
            <label htmlFor="defaultSeoDescription">Description</label>
            <textarea id="defaultSeoDescription" name="defaultSeoDescription" required rows={3} defaultValue={config.defaultSeo.description} />
          </div>
          <div className="payload-field">
            <label htmlFor="defaultSeoOgImageUrl">OG image URL</label>
            <input id="defaultSeoOgImageUrl" name="defaultSeoOgImageUrl" defaultValue={config.defaultSeo.ogImageUrl ?? ""} />
          </div>
          <label className="payload-checkbox">
            <input name="defaultSeoNoindex" type="checkbox" defaultChecked={config.defaultSeo.noindex ?? false} />
            <span>Noindex entire site</span>
          </label>
        </section>
        <section className="payload-form-section">
          <h2>Fixed page SEO</h2>
          {(["home", "products", "news", "contact"] as const).map((page) => (
            <div className="payload-field-grid" key={page}>
              <div className="payload-field">
                <label htmlFor={`${page}SeoTitle`}>{page} title</label>
                <input id={`${page}SeoTitle`} name={`${page}SeoTitle`} defaultValue={config.pageSeo?.[page]?.title ?? ""} />
              </div>
              <div className="payload-field">
                <label htmlFor={`${page}SeoDescription`}>{page} description</label>
                <input
                  id={`${page}SeoDescription`}
                  name={`${page}SeoDescription`}
                  defaultValue={config.pageSeo?.[page]?.description ?? ""}
                />
              </div>
            </div>
          ))}
        </section>
        <section className="payload-form-section">
          <h2>Internationalization</h2>
          <p className="payload-muted">
            These settings reserve the locale contract for future multilingual pages. The current frontend still serves the original routes.
          </p>
          <div className="payload-field-grid">
            <div className="payload-field">
              <label htmlFor="i18nDefaultLocale">Default locale</label>
              <input id="i18nDefaultLocale" name="i18nDefaultLocale" required defaultValue={i18n.defaultLocale} />
            </div>
            <div className="payload-field">
              <label htmlFor="i18nFallbackLocale">Fallback locale</label>
              <input id="i18nFallbackLocale" name="i18nFallbackLocale" defaultValue={i18n.fallbackLocale ?? i18n.defaultLocale} />
            </div>
            <div className="payload-field">
              <label htmlFor="i18nRoutingStrategy">Routing strategy</label>
              <select id="i18nRoutingStrategy" name="i18nRoutingStrategy" defaultValue={i18n.routingStrategy}>
                <option value="none">No locale prefix for now</option>
                <option value="path-prefix">Path prefix later (/en, /zh-CN)</option>
              </select>
            </div>
            <div className="payload-field">
              <label htmlFor="i18nEnabledLocales">Enabled locales</label>
              <input id="i18nEnabledLocales" name="i18nEnabledLocales" placeholder="en, zh-CN, ar" defaultValue={enabledLocales} />
            </div>
          </div>
        </section>
        <button className="payload-button" type="submit">
          Save settings
        </button>
      </form>
    </div>
  );
}
