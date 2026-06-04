import { createMetadata } from "@global-trade/core";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPost } from "@/lib/data";
import { getRuntimeSiteConfig } from "@/lib/site-config";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const [post, siteConfig] = await Promise.all([getPost(slug), getRuntimeSiteConfig()]);
  if (!post) return {};
  const metadata = createMetadata(siteConfig, post.seo, `/news/${post.slug}`);
  return {
    title: metadata.title,
    description: metadata.description,
    alternates: { canonical: metadata.canonicalUrl },
    robots: metadata.robots,
    openGraph: metadata.openGraph
  };
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  return (
    <main>
      <section className="page-hero">
        <div className="shell">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-[#ffb36b]">News</p>
          <h1>{post.title}</h1>
          {post.excerpt && <p>{post.excerpt}</p>}
        </div>
      </section>
      <section className="inshow-section bg-white">
        <article className="shell max-w-4xl">
          {post.featuredImage?.publicUrl && (
            <img className="mb-8 aspect-[16/9] w-full rounded-lg object-cover shadow-soft" src={post.featuredImage.publicUrl} alt={post.featuredImage.alt ?? post.title} />
          )}
          <div className="rich-text" dangerouslySetInnerHTML={{ __html: post.richText }} />
        </article>
      </section>
    </main>
  );
}
