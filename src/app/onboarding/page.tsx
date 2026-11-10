import { Brand, Footer } from "@/components/brand";
import { MovieForm } from "@/components/movie-form";
import { SubmitButton } from "@/components/submit-button";
import { requireUser } from "@/lib/current-user";
import { logout } from "@/app/actions";
import { redirect } from "next/navigation";
import { Heart } from "lucide-react";
export default async function Onboarding() {
  const user = await requireUser();
  if (user.favoriteMovie) redirect("/dashboard");
  return (
    <div className="page-shell">
      <header className="site-header">
        <Brand />
        <form action={logout}>
          <SubmitButton className="button-text" pendingLabel="Signing out…">
            Logout
          </SubmitButton>
        </form>
      </header>
      <main id="main-content" className="onboarding-main">
        <div className="welcome-icon">
          <Heart size={30} />
        </div>
        <span className="eyebrow">YOUR STORY STARTS HERE</span>
        <h1>
          Everyone has
          <br />
          <em>that one movie.</em>
        </h1>
        <p className="onboarding-description">
          Welcome, {user.name?.trim() || "movie lover"}. Tell us the film that
          has a special place in your heart.
        </p>
        <MovieForm />
        <p className="onboarding-footnote">
          One small choice. A whole new way to see your favorite.
        </p>
      </main>
      <Footer />
    </div>
  );
}
