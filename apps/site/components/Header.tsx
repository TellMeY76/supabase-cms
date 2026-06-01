import Link from "next/link";
import { ChevronDown, Search } from "lucide-react";
import { listCategories } from "@/lib/data";
import { categoryPath, categoryTitle } from "@/lib/frontend-helpers";
import { inshowAssets } from "@/lib/inshow-assets";

const staticNav = [
  { label: "Home", href: "/" },
  { label: "About Us", href: "/about-us" },
  { label: "News", href: "/news" },
  { label: "Contact", href: "/contact" }
];

export async function Header() {
  const categories = await listCategories();
  const topCategories = categories.filter((category) => !category.parentId).slice(0, 3);

  return (
    <header id="masthead" className="site-header">
      <div className="site-branding">
        <Link className="custom-logo-link" href="/">
          <img className="custom-logo" src={inshowAssets.logo} alt="INSHOW HOME" />
        </Link>
        <div className="site-title-block">
          <p className="site-title"><Link href="/">INSHOW HOME</Link></p>
          <p className="site-description">Full range customization.</p>
        </div>
      </div>
      <div className="menu-search-block">
        <nav id="site-navigation" className="main-navigation" aria-label="Main navigation">
          <ul className="nav-menu">
            <li><Link href="/">Home</Link></li>
            <li><Link href="/about-us">About Us</Link></li>
            <li className="menu-item-has-children menu-item-product">
              <Link href="/products">Products <ChevronDown size={12} strokeWidth={3} /></Link>
              <div className="dropdown-content">
                <div className="flex-container">
                  {topCategories.map((category) => {
                    const children = categories.filter((item) => item.parentId === category.id).slice(0, 8);
                    return (
                      <div className="category-item flex-item" key={category.id}>
                        <Link className="first-level-link" href={categoryPath(category, categories)}>
                          {categoryTitle(category)}
                        </Link>
                        <div className="subcategories">
                          {children.map((child) => (
                            <Link href={categoryPath(child, categories)} key={child.id}>
                              {categoryTitle(child)}
                            </Link>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </li>
            <li><Link href="/news">News</Link></li>
            <li><Link href="/contact">Contact</Link></li>
          </ul>
        </nav>
        <form className="search-form" action="/products">
          <button aria-label="Search" className="search-submit inShow-submit" type="submit">
            <Search size={15} />
          </button>
          <input aria-label="Search products" className="search-field" name="q" placeholder="搜索..." type="search" />
        </form>
      </div>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {staticNav.map((item) => (
          <Link href={item.href} key={item.href}>
            {item.label}
          </Link>
        ))}
        <Link href="/products">Products</Link>
      </nav>
    </header>
  );
}
