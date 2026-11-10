import {
  ArrowDown,
  Sparkles,
  Ticket,
  Film,
  Heart,
  LockKeyhole,
} from "lucide-react";
import { Brand, Footer } from "@/components/brand";
import { SubmitButton } from "@/components/submit-button";
import { currentUser } from "@/lib/current-user";
import { login } from "@/app/actions";
import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await currentUser();
  if (user) redirect(user.favoriteMovie ? "/dashboard" : "/onboarding");
  const { error } = await searchParams;
  return (
    <div className="page-shell">
      <header className="site-header">
        <Brand />
        <a className="nav-link" href="#how-it-works">
          How it works <ArrowDown size={14} />
        </a>
      </header>
      <main id="main-content">
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="tiny-dot" /> FOR THE FILMS THAT STAY WITH YOU
            </div>
            <h1>
              Some movies
              <br />
              stay with you.
              <br />
              <em>Keep the magic.</em>
            </h1>
            <p className="hero-description">
              Your favorite film has more stories to tell. Save the movie you
              love and discover a little something you didn’t know.
            </p>
            <form action={login}>
              <SubmitButton pendingLabel="Taking you to Google…">
                <span className="google-g" aria-hidden="true">
                  G
                </span>
                Sign in with Google
              </SubmitButton>
            </form>
            {error && (
              <p role="alert" className="error-message">
                {error === "Configuration"
                  ? "Google sign-in isn’t configured yet. Please try again once setup is complete."
                  : "Sign-in didn’t finish. Please try again with your Google account."}
              </p>
            )}
            <p className="signin-note">
              <LockKeyhole size={12} /> Just your Google account. No new
              password.
            </p>
          </div>
          <div
            className="hero-art"
            aria-label="Illustrated cinema ticket and a film reel"
          >
            <div className="art-orbit orbit-one" />
            <div className="art-orbit orbit-two" />
            <span className="art-spark spark-one">✳</span>
            <span className="art-spark spark-two">✦</span>
            <div className="movie-ticket">
              <div className="ticket-top">
                <span>MOVIE MEMORY PRESENTS</span>
                <Film size={18} />
              </div>
              <div className="ticket-art">
                <div className="sun" />
                <div className="mountain mountain-back" />
                <div className="mountain mountain-front" />
                <div className="frame-corner tl" />
                <div className="frame-corner br" />
              </div>
              <div className="ticket-title">
                Your all-time
                <br />
                <em>favorite.</em>
              </div>
              <div className="ticket-tear" />
              <div className="ticket-bottom">
                <span>
                  ADMIT ONE
                  <br />
                  <strong>A LIFETIME OF REWATCHES</strong>
                </span>
                <span className="barcode" />
              </div>
            </div>
            <div className="floating-note">
              <Sparkles size={22} />
              <span>
                There’s always
                <br />
                <strong>another story.</strong>
              </span>
            </div>
            <span className="art-caption">GOOD FILMS. LITTLE DISCOVERIES.</span>
          </div>
        </section>
        <section id="how-it-works" className="how-section">
          <div className="section-heading">
            <span className="eyebrow">YOUR NEXT LITTLE DISCOVERY</span>
            <h2>One favorite. A new perspective.</h2>
          </div>
          <div className="steps">
            <article>
              <span className="step-icon">
                <Ticket size={23} />
              </span>
              <span className="step-number">01</span>
              <h3>Make yourself at home</h3>
              <p>Sign in with Google. Your own little corner of the cinema.</p>
            </article>
            <article>
              <span className="step-icon">
                <Heart size={23} />
              </span>
              <span className="step-number">02</span>
              <h3>Pick the one you love</h3>
              <p>
                A childhood classic or a recent obsession. Which film is yours?
              </p>
            </article>
            <article>
              <span className="step-icon">
                <Sparkles size={23} />
              </span>
              <span className="step-number">03</span>
              <h3>Find a hidden detail</h3>
              <p>
                Discover an AI-generated fact about the movie you keep coming
                back to.
              </p>
            </article>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
