export default function ProductsLoading() {
  return (
    <main className="route-loading-shell">
      <div className="route-loading-grid route-loading-grid--products">
        <aside className="route-loading-sidebar">
          <span />
          <span />
          <span />
          <span />
        </aside>
        <section className="route-loading-products" aria-label="Loading products">
          {Array.from({ length: 9 }, (_, index) => (
            <article className="route-loading-card" key={index}>
              <div />
              <span />
              <p />
              <small />
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
