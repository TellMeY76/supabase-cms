import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { listPosts } from "@/lib/data";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function NewsPage() {
  const posts = await listPosts();
  return (
    <main>
      <section className="page-hero">
        <div className="shell">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-[#ffb36b]">News</p>
          <h1>Project updates and product notes</h1>
          <p>Imported WordPress posts are presented as a clean editorial feed for the rebuilt site.</p>
        </div>
      </section>
      <section className="inshow-section">
        <div className="shell grid gap-6 md:grid-cols-2">
          {posts.map((post) => (
            <Link className="group rounded-lg border border-zinc-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-soft" href={`/news/${post.slug}`} key={post.id}>
              {post.featuredImage?.publicUrl && (
                <img className="mb-5 aspect-[16/9] w-full rounded-md object-cover" src={post.featuredImage.publicUrl} alt={post.featuredImage.alt ?? post.title} />
              )}
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#ff881b]">{post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : "News"}</p>
              <h2 className="mt-2 text-2xl font-black leading-tight text-[#072941] group-hover:text-[#ff881b]">{post.title}</h2>
              <p className="mt-3 line-clamp-3 text-sm leading-6 text-zinc-600">{post.excerpt}</p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-black text-[#072941]">
                Read More <ArrowRight size={15} />
              </span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
