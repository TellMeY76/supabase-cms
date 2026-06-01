import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { inshowAssets } from "@/lib/inshow-assets";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const capabilityBlocks = [
  {
    title: "40 Years of Production and Supply Expertise:",
    text: "Since 1985, CHINA-BASE has been dedicated to delivering Stable, Reliable, and High-Value services to trading clients worldwide."
  },
  {
    title: "Comprehensive Understanding of Production and Customer Needs:",
    text: "Through INSHOW HOME, we address traditional trade challenges by optimizing the supply chain across production, inventory, logistics, warehousing, finance, and innovative technologies."
  },
  {
    title: "Cutting-Edge Technologies:",
    text: "With tools like Metabigbuyer, customers can seamlessly access product information online and integrate items into real-world scenarios for better purchasing decisions."
  },
  {
    title: "A One-Stop Solution in the Building Materials Industry:",
    text: "INSHOW HOME has developed a comprehensive service system covering prefabricated houses, interior and exterior building materials, and interior decor solutions."
  }
];

export default function AboutPage() {
  return (
    <main className="about-page">
      <section className="about-intro-block">
        <div className="about-intro-grid">
          <div className="about-intro-title">
            <h1>ABOUT INSHOW HOME</h1>
          </div>
          <div className="about-profile-frame">
            <img src={inshowAssets.profile} alt="CBNB profile" />
            <img className="about-profile-logo" src={inshowAssets.logo} alt="INSHOW HOME" />
          </div>
          <div className="about-copy-stack">
            {capabilityBlocks.slice(0, 2).map((block) => (
              <div className="about-copy-item" key={block.title}>
                <h2>{block.title}</h2>
                <p>{block.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="about-capability-block">
        <div className="about-capability-grid">
          <div className="about-capability-copy">
            {capabilityBlocks.slice(2).map((block) => (
              <div className="about-copy-item" key={block.title}>
                <h2>{block.title}</h2>
                <p>{block.text}</p>
              </div>
            ))}
          </div>
          <div className="about-shape-images">
            <img className="about-shape-blob" src={inshowAssets.aboutBlob} alt="INSHOW HOME technology" />
            <img className="about-shape-round" src={inshowAssets.aboutRound} alt="INSHOW HOME building materials" />
          </div>
        </div>
      </section>

      <section className="home-reach-section about-map-section">
        <div className="home-reach-card">
          <div>
            <p className="home-orange-label">REACH US AT:</p>
            <p>
              <strong>Head office Add:</strong> No.666 TianTong South Road, Yingzhou District, Ningbo, China
            </p>
            <p>
              <strong>KSA office Add:</strong> E33, Dragon World Saudi Arabia, Ground Floor Rimal Center, Exit 16, East Ring Road, Riyadh, Saudi Arabia
            </p>
            <p>
              <strong>UK office Add:</strong> Unit H, Acorn industrial Park, Crayford, London, DA14FL
            </p>
            <p>
              <strong>USA office Add:</strong> 150 N Santa Anita Ave Suite 300 Arcadia CA91006
            </p>
          </div>
          <div>
            <p className="home-orange-label">OR EMAIL TO:</p>
            <h3>sales@cbhtglobal.com</h3>
            <Link className="inshow-button" href="/contact">
              Contact us <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
