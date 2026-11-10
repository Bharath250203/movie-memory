import { Sparkles, CircleAlert } from "lucide-react";
import { getCurrentFact } from "@/lib/current-fact";
import { FactText } from "@/components/fact-text";
import { RefreshFact } from "@/components/refresh-fact";
export async function FactCard() {
  const result = await getCurrentFact();
  return (
    <section className="fact-card" aria-labelledby="fact-heading">
      <div className="eyebrow">
        <Sparkles size={16} /> BEHIND THE SCENES
      </div>
      <h2 id="fact-heading">A little movie magic.</h2>
      {result.ok ? (
        <>
          <FactText text={result.fact.text} citations={result.fact.citations} />
          {result.source === "stale" && (
            <p className="muted" role="status">
              We couldn’t refresh your fact right now. Your last saved fact is
              still here.
            </p>
          )}
          {result.source === "unchanged" && (
            <p className="muted" role="status">
              No different fact found—showing your previous fact.
            </p>
          )}
          <div className="fact-bottom">
            <span>
              {result.source === "stale" || result.source === "unchanged"
                ? "Showing your last saved fact"
                : result.source === "cached"
                  ? "Saved fact · Fresh for 60 seconds"
                  : "AI + web sources · Saved to your collection"}
            </span>
            <RefreshFact />
          </div>
          <p className="fact-disclaimer">
            Refresh to request a new fact after 60 seconds. AI can make
            mistakes.
          </p>
        </>
      ) : (
        <div role="alert">
          <p className="fact-text error-fact">
            <CircleAlert size={22} />
            {result.error}
          </p>
          <RefreshFact retry />
        </div>
      )}
    </section>
  );
}
export function FactLoading() {
  return (
    <section
      className="fact-card"
      aria-busy="true"
      aria-label="Getting your movie fact"
    >
      <div className="eyebrow">
        <Sparkles size={16} /> BEHIND THE SCENES
      </div>
      <h2>A little movie magic.</h2>
      <p className="muted" role="status">
        Finding a story behind your favorite story…
      </p>
      <div className="skeleton" />
      <div className="skeleton short" />
    </section>
  );
}
