import type { Post } from "@global-trade/core";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { listPosts } from "@/lib/data";

export const revalidate = 300;

export default async function NewsPage() {
  const posts = await listPosts();
  const [featuredPost, ...remainingPosts] = posts;
  const newsItems = remainingPosts.slice(0, 6);

  return (
    <main className="news-page">
      {featuredPost ? (
        <section className="news-hero">
          <p>COMPANY NEWS</p>
          <h1>{featuredPost.title}</h1>
          <Link className="news-detail-button" href={`/news/${featuredPost.slug}`}>
            Detail <ArrowRight size={18} />
          </Link>
        </section>
      ) : (
        <section className="news-hero">
          <p>COMPANY NEWS</p>
          <h1>News</h1>
        </section>
      )}

      <section className="news-list-section">
        <div className="news-list-grid">
          {newsItems.map((post, index) => (
            <Link className="news-list-card" href={`/news/${post.slug}`} key={post.id}>
              <div className="news-list-meta">
                <span>{newsCategoryLabel(post, index)}</span>
                <time dateTime={post.publishedAt}>{formatNewsDate(post.publishedAt)}</time>
              </div>
              <h2>{post.title}</h2>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

function formatNewsDate(date: string | undefined) {
  if (!date) return "";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "";
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}/${month}/${day}`;
}

function newsCategoryLabel(post: Post, index: number) {
  const text = `${post.title} ${post.excerpt ?? ""}`.toLowerCase();
  if (text.includes("airbnb") || text.includes("lifestyle") || text.includes("tiny house")) return "LIFESTYLE";
  return index === 2 || index === 4 || index === 5 ? "LIFESTYLE" : "COMPANY NEWS";
}
