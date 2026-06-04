export default function AdminProtectedLoading() {
  return (
    <div className="payload-admin-loading" aria-label="Loading admin page">
      <div className="payload-admin-loading__header">
        <span />
        <span />
      </div>
      <div className="payload-admin-loading__toolbar">
        <span />
        <span />
      </div>
      <div className="payload-admin-loading__table">
        {Array.from({ length: 7 }).map((_, index) => (
          <span key={index} />
        ))}
      </div>
    </div>
  );
}
