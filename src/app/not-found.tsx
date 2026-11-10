import Link from "next/link";
export default function NotFound() {
  return (
    <main id="main-content" className="error-page">
      <span className="eyebrow">WRONG SCREEN</span>
      <h1>This scene is missing.</h1>
      <p>Let’s get you back to your movie.</p>
      <Link className="button-primary" href="/">
        Back to home
      </Link>
    </main>
  );
}
