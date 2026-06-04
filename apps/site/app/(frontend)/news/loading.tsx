export default function NewsLoading() {
  return (
    <main className="route-loading-shell">
      <section className="route-loading-news-hero">
        <span />
        <h1 />
        <p />
      </section>
      <section className="route-loading-news-grid" aria-label="Loading news">
        {Array.from({ length: 6 }, (_, index) => (
          <article key={index}>
            <span />
            <h2 />
          </article>
        ))}
      </section>
    </main>
  );
}
