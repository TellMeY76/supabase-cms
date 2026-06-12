import Link from "next/link";
import { inshowAssets } from "@/lib/inshow-assets";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer id="colophon" className="site-footer">
      <div className="before-container" />
      <div className="footer-container">
        <div className="footer-columns">
          <div className="footer-column">
            <div className="footer-widget footer-info-widget">
              <div className="site-branding">
                <img className="custom-logo" src={inshowAssets.footerLogo} alt="INSHOW HOME" />
                <div className="site-title-block">
                  <h1 className="site-title">INSHOW HOME</h1>
                  <p className="site-description">Full range customization.</p>
                </div>
              </div>
              <h2>Address</h2>
              <p>Ningbo Zhejiang</p>
              <h2>Office Hours</h2>
              <p>Monday - Sunday 10.00 - 18.00.</p>
            </div>
          </div>
          <div className="footer-column">
            <div className="footer-widget footer-contact-widget">
              <h1 className="footer-widget-title">Get in Touch</h1>
              <div className="footer-contact-widget_block">
                <h2>Phone</h2>
                <p>+86 136-8588-2988</p>
              </div>
              <div className="footer-contact-widget_block">
                <h2>Email</h2>
                <p>info/sales@inshowhome.com</p>
              </div>
            </div>
          </div>
          <div className="footer-column">
            <div className="footer-widget">
              <h1 className="footer-widget-title">Usefull Link</h1>
              <ul className="friend-links">
                <li><Link href="/about-us">Warranty &amp; Complaints</Link></li>
                <li><Link href="/products">Order &amp; Shipping</Link></li>
                <li><Link href="/about-us">Tracking Order</Link></li>
                <li><Link href="/about-us">About Us</Link></li>
                <li><Link href="/about-us">Terms</Link></li>
                <li><Link href="/contact">FAQ</Link></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="footer-copyright">
          <p>&copy; {year} INSHOW HOME. All Rights Reserved.</p>
        </div>
      </div>
    </footer>
  );
}
