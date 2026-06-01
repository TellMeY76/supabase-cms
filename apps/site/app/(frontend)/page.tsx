import Link from "next/link";
import { InquiryForm } from "@/components/InquiryForm";
import { inshowAssets, inshowCategoryTiles } from "@/lib/inshow-assets";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const statItems = [
  ["One-Stop Management", inshowAssets.statOneStop],
  ["84 Units Subsidiaries", inshowAssets.statSubsidiaries],
  ["Worldwide Branches", inshowAssets.statBranches],
  ["USD 6 Billion 2024 Import & Export Volume", inshowAssets.statVolume],
  ["China’s Top500 Enterprise", inshowAssets.statEnterprise],
];

const projectItems = [
  ["2010 World Expo - Japan Pavilion", inshowAssets.projectExpoJapan],
  ["2010 World Expo - Korea Pavilion", inshowAssets.projectExpoKorea],
  ["Canberra, Australi - Canberra townhouses", inshowAssets.projectCanberra],
  ["Perth, Australi - Retirement-center", inshowAssets.projectPerth],
];

const certificateItems = [
  inshowAssets.certificateReach,
  inshowAssets.certificateOne,
  inshowAssets.certificateTwo,
  inshowAssets.certificateThree,
  inshowAssets.certificateFour,
  inshowAssets.certificateFive,
  inshowAssets.certificateSix,
];

export default function HomePage() {
  return (
    <main className="home-page">
      <section className="inshow-hero">
        <video autoPlay loop muted playsInline src={inshowAssets.heroVideo} />
        <div className="inshow-hero__content">
          <img
            className="inshow-hero__logo"
            src={inshowAssets.logo}
            alt="INSHOW HOME"
          />
          <h1>
            Contributing to the Society by Manufacturing Products that Create
            the Future
          </h1>
          <div className="inshow-hero__actions">
            <Link className="inshow-button" href="/about-us">
              Know More
            </Link>
          </div>
        </div>
      </section>

      <section className="inshow-section products-section">
        <div className="shell">
          <div className="inshow-section-header">
            <h2>PRODUCTS</h2>
            <p>Discover Our Advanced Products Range</p>
          </div>
          <div className="category-showcase">
            {inshowCategoryTiles.map(tile => (
              <Link
                className="category-tile group"
                href={tile.href}
                key={tile.title}
              >
                <img src={tile.image} alt={tile.title} />
                <div className="category-tile__body">
                  <h3>{tile.title}</h3>
                  <p>{tile.subtitle}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="home-about-section">
        <div className="home-about-grid">
          <div className="home-about-card">
            <img src={inshowAssets.profile} alt="CBNB profile" />
          </div>
          <div className="home-about-copy">
            <h2>
              <strong>ABOUT US</strong>
            </h2>
            <h3>POWERED BY CBNB, SAILING ON THE WORLD</h3>
            <ul>
              <li>Supply Chain & Logistics & Warehouse Network & Finance</li>
              <li>Worldwide Branches & Relations</li>
              <li>40 Years Business Experience</li>
              <li>Strong R&D Input</li>
              <li>High Tech Support</li>
            </ul>
          </div>
        </div>
        <div className="home-stats">
          {statItems.map(([label, icon]) => (
            <div className="home-stat-item" key={label}>
              <strong>{label}</strong>
              <img src={icon} alt="" />
            </div>
          ))}
        </div>
      </section>

      <section className="home-why-section">
        <div className="shell">
          <div className="inshow-section-header">
            <h2>WHY INSHOW HOME</h2>
            <p>
              Since 1985, CHINA-BASE has been committed to providing stable,
              reliable, and high-value services to trading clients. Building on
              decades of global supply chain networks, logistics, warehousing,
              and international relations, we are taking our service to the next
              level with INSHOW HOME.
            </p>
          </div>
        </div>
      </section>

      <section className="home-projects-section">
        <div className="shell">
          <div className="inshow-section-header">
            <h2>INSHOW HOME PROJECTS</h2>
          </div>
          <div className="home-project-grid">
            {projectItems.map(([title, image]) => (
              <article key={title}>
                <img src={image} alt={title} />
                <h3>{title}</h3>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="home-cert-section">
        <div className="shell">
          <div className="inshow-section-header">
            <h2>CERTIFICATES</h2>
          </div>
          <div className="certificate-strip">
            {certificateItems.map(src => (
              <img src={src} alt="INSHOW HOME certificate" key={src} />
            ))}
          </div>
        </div>
      </section>

      <section className="home-reach-section">
        <div className="shell reach-grid">
          <div>
            <h2>REACH US AT:</h2>
            <p>
              Head office Add : No.666 TianTong South Road, Yingzhou District,
              Ningbo, China
              <br />
              KSA office Add : E33, Dragon World Saudi Arabia, Ground Floor
              Rimal Center, Riyadh, Saudi Arabia
              <br />
              UK office Add : Unit H, Acorn industrial Park, Crayford, London,
              DA14FL
              <br />
              USA office Add : 150 N Santa Anita Ave Suite 300 Arcadia CA91006
            </p>
          </div>
          <div>
            <h2>OR EMAIL TO:</h2>
            <strong>sales@cbhtglobal.com</strong>
          </div>
        </div>
      </section>

      <section className="home-inquiry-section">
        <div className="home-inquiry-shell">
          <InquiryForm formType="contact" sourceUrl="/" />
        </div>
      </section>
    </main>
  );
}
