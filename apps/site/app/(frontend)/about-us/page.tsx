import { ReachUsSection } from "@/components/ReachUsSection";
import { inshowAssets } from "@/lib/inshow-assets";

export const revalidate = 300;

export default function AboutPage() {
  return (
    <main className="about-page">
      <section className="about-hero-block">
        <h1>ABOUT INSHOW HOME</h1>
        <div className="about-hero-grid">
          <div className="about-hero-logo">
            <img src={inshowAssets.logo} alt="INSHOW HOME" />
          </div>
          <div className="about-hero-copy">
            <article>
              <h2>40 Years of Production and Supply Expertise:</h2>
              <p>
                Since <strong>1985</strong>, <strong>CHINA-BASE</strong> has
                been dedicated to delivering Stable, Reliable, and High-Value
                services to trading clients worldwide.
              </p>
            </article>
            <article>
              <h2>Comprehensive Understanding of Production and Customer Needs:</h2>
              <p>
                <strong>Traditional Trade</strong> often faces challenges from
                both ends. On the <strong>Production</strong> side, balancing{" "}
                <strong>Manufacturing with Inventory Management</strong> is
                complex, leading to <strong>Price Fluctuations</strong>. On the{" "}
                <strong>Demand</strong> side, <strong>Inconsistent Needs</strong>{" "}
                and <strong>Long Supply Cycles</strong> can result in{" "}
                <strong>Overstocking or Shortages</strong>.
              </p>
              <p>
                Through INSHOW HOME, we address these challenges by optimizing
                the <strong>Supply Chain</strong>. During{" "}
                <strong>Low-Demand Periods</strong>, production can continue
                uninterrupted, and during <strong>Peak Demand</strong>, customers
                can access goods quickly. By integrating{" "}
                <strong>Supply Chain Management, Logistics, Warehousing, Finance,
                and Innovative Technologies</strong>, INSHOW HOME significantly
                reduces the inefficiencies of <strong>Traditional Trade Models</strong>.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="about-capability-block">
        <div className="about-capability-grid">
          <div className="about-capability-copy">
            <article className="about-copy-item">
              <h2>Cutting-Edge Technologies:</h2>
              <p>
                With tools like <strong>Metabigbuyer</strong>, customers can
                seamlessly access product information online, integrating items
                into real-world scenarios for better purchasing decisions.
                Looking ahead, we will further enhance our digital showroom,
                refining product details and expanding our range to provide a
                truly modern and efficient ordering experience.
              </p>
            </article>
            <article className="about-copy-item">
              <h2>A One-Stop Solution in the Building Materials Industry:</h2>
              <p>
                With years of expertise, INSHOW HOME has developed a{" "}
                <strong>Comprehensive One-Stop Service System</strong>{" "}
                encompassing <strong>Prefabricated-Houses, Interior and Exterior
                Building Materials</strong>, and <strong>Interior Decor Solutions</strong>.
              </p>
            </article>
          </div>
          <div className="about-shape-images">
            <img className="about-shape-blob" src={inshowAssets.aboutBlob} alt="INSHOW HOME digital showroom" />
            <img className="about-shape-round" src={inshowAssets.aboutRound} alt="INSHOW HOME industrial park" />
          </div>
        </div>
      </section>

      <section className="about-world-section">
        <img src={inshowAssets.contactMap} alt="" />
        <p>
          Rooted in Ningbo and thriving globally, we bring China&apos;s supply
          chain excellence to the world. Leveraging decades of industry
          experience and an extensive subsidiary network, we offer global clients
          not just superior quality and pricing but also unmatched product design
          expertise. INSHOW HOME is committed to creating higher trade value and
          contributing to a more efficient, professional, and innovative future
          for global trade.
        </p>
      </section>

      <ReachUsSection />
    </main>
  );
}
