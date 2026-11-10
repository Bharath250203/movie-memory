"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main-content" className="error-page">
      <span className="eyebrow">A BRIEF INTERMISSION</span>
      <h1>Let’s try that again.</h1>
      <p>
        We couldn’t load this page right now. Your saved movie is still yours.
      </p>
      <button className="button-primary" onClick={reset}>
        Try again
      </button>
      <a href="/">Back to home</a>
    </main>
  );
}
