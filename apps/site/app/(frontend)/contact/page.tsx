import { Mail, MapPin, Phone } from "lucide-react";
import { InquiryForm } from "@/components/InquiryForm";
import { inshowAssets } from "@/lib/inshow-assets";

const headquartersCards = [
  {
    title: "Email",
    value: "info/sales@inshowhome.com",
    Icon: Mail
  },
  {
    title: "Tel",
    value: "+86 136-8588-2988",
    Icon: Phone
  },
  {
    title: "Address",
    value: "Room.1030,No.1Building,Logistic Center,Meishan Harbour Ningbo Zhejiang",
    Icon: MapPin
  }
];

const regionalCards = [
  {
    title: "Address",
    value: "Room.1030,No.1Building,Logistic Center,Meishan Harbour Ningbo Zhejiang"
  },
  {
    title: "Address",
    value: "Room.1030,No.1Building,Logistic Center,Meishan Harbour Ningbo Zhejiang"
  }
];

export default function ContactPage() {
  return (
    <main className="contact-page">
      <section className="contact-hero">
        <img src={inshowAssets.contactHero} alt="Contact INSHOW HOME" />
        <div className="contact-hero-copy">
          <p>Any Questions?</p>
          <p>Contact us.</p>
        </div>
      </section>

      <section className="contact-form-section">
        <div className="contact-form-shell">
          <InquiryForm formType="contact" sourceUrl="/contact" />
        </div>
      </section>

      <section className="contact-offices-section">
        <div className="contact-offices-inner">
          <h2>Inshowhome Headquarters</h2>
          <div className="contact-card-grid contact-card-grid--three">
            {headquartersCards.map(({ title, value, Icon }) => (
              <article className="contact-office-card" key={title}>
                <Icon size={36} strokeWidth={1.9} />
                <h3>{title}</h3>
                <p>{value}</p>
              </article>
            ))}
          </div>

          <h2>Saudi Arabia Regional Office</h2>
          <div className="contact-card-grid contact-card-grid--two">
            {regionalCards.map(({ title, value }, index) => (
              <article className="contact-office-card" key={`${title}-${index}`}>
                <MapPin size={36} strokeWidth={1.9} />
                <h3>{title}</h3>
                <p>{value}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
