export default function Loading() {
  return (
    <main id="main-content" className="error-page" aria-busy="true">
      <span className="eyebrow">MOVIE MEMORY</span>
      <p role="status">Setting the scene…</p>
      <div className="skeleton" />
    </main>
  );
}
