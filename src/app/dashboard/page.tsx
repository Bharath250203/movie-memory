import { Suspense } from "react";
import { Brand, Footer } from "@/components/brand";
import { Avatar } from "@/components/avatar";
import { FactCard, FactLoading } from "@/components/fact-card";
import { SubmitButton } from "@/components/submit-button";
import { requireUser } from "@/lib/current-user";
import { logout } from "@/app/actions";
import { redirect } from "next/navigation";
import { Film, Heart } from "lucide-react";
import { EditMovie } from "@/components/edit-movie";
export const dynamic = "force-dynamic";
export default async function Dashboard() {
  const user = await requireUser();
  if (!user.favoriteMovie) redirect("/onboarding");
  const name = user.name?.trim() || "Movie lover";
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
      <main id="main-content" className="dashboard-main">
        <div className="dashboard-heading">
          <div>
            <div className="eyebrow">YOUR LITTLE CORNER OF CINEMA</div>
            <h1>
              Welcome back,
              <br />
              <em>{name}.</em>
            </h1>
          </div>
          <div className="profile">
            <Avatar name={name} image={user.image} />
            <div>
              <strong>{name}</strong>
              <span>{user.email}</span>
            </div>
          </div>
        </div>
        <div className="dashboard-grid">
          <section className="favorite-card">
            <div className="eyebrow">
              <Heart size={15} /> YOUR ALL-TIME FAVORITE
            </div>
            <div className="favorite-art" aria-hidden="true">
              <Film size={72} strokeWidth={1} />
              <span className="favorite-star">✳</span>
            </div>
            <h2>{user.favoriteMovie}</h2>
            <p>Some stories are worth keeping.</p>
            <EditMovie key={user.favoriteMovie} movie={user.favoriteMovie} />
            <span className="saved-badge">✓ Saved to your memory</span>
          </section>
          <Suspense key={user.favoriteMovie} fallback={<FactLoading />}>
            <FactCard />
          </Suspense>
        </div>
        <p className="dashboard-caption">
          The credits roll. The curiosity stays.
        </p>
      </main>
      <Footer />
    </div>
  );
}
