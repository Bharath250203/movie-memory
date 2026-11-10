import {
  UnverifiedMovieError,
  NoDifferentFactError,
  sameFactText,
  type GeneratedFact,
  type FactCitation,
} from "@/lib/fact-content";
export const FACT_TTL_MS = 60_000;
export type StoredFact = {
  text: string;
  movie: string;
  createdAt: Date;
  citations?: FactCitation[];
};
export type FactResult =
  | {
      ok: true;
      fact: StoredFact;
      source: "generated" | "cached" | "stale" | "unchanged";
    }
  | { ok: false; error: string };
export type FactKey = { userId: string; movie: string };
export interface FactDependencies {
  latest: (key: FactKey) => Promise<StoredFact | null>;
  generate: (
    movie: string,
    previousFact?: string,
  ) => Promise<string | GeneratedFact>;
  save: (
    data: FactKey & { text: string; citations?: FactCitation[] },
  ) => Promise<StoredFact>;
  now?: () => number;
}

// Single-flight protection for one server process. Database facts survive restarts;
// the lock does not coordinate multiple processes (see README tradeoffs).
export function createFactService() {
  const inFlight = new Map<string, Promise<FactResult>>();
  return async function getFact(
    user: { id: string; favoriteMovie: string | null },
    deps: FactDependencies,
  ): Promise<FactResult> {
    if (!user.favoriteMovie)
      return { ok: false, error: "Choose your favorite movie first." };
    const key = { userId: user.id, movie: user.favoriteMovie };
    const lockKey = JSON.stringify([key.userId, key.movie]);
    const pending = inFlight.get(lockKey);
    if (pending) return pending;
    // Defer work until after the promise has been registered, including cache lookup.
    const task = Promise.resolve().then(async (): Promise<FactResult> => {
      let latest: StoredFact | null;
      try {
        latest = await deps.latest(key);
      } catch {
        return {
          ok: false,
          error: "We couldn’t load your movie fact. Please try again.",
        };
      }
      const now = (deps.now ?? Date.now)();
      if (
        latest &&
        now - latest.createdAt.getTime() >= 0 &&
        now - latest.createdAt.getTime() < FACT_TTL_MS
      )
        return { ok: true, fact: latest, source: "cached" };
      let text: string;
      let citations: FactCitation[] | undefined;
      try {
        const generated = latest
          ? await deps.generate(key.movie, latest.text)
          : await deps.generate(key.movie);
        text =
          typeof generated === "string" ? generated.trim() : generated.text;
        citations =
          typeof generated === "string" ? undefined : generated.citations;
        if (!text || text.length > 2000)
          throw new Error("Invalid fact response");
      } catch (error) {
        if (latest && error instanceof NoDifferentFactError)
          return { ok: true, fact: latest, source: "unchanged" };
        if (latest) return { ok: true, fact: latest, source: "stale" };
        if (error instanceof UnverifiedMovieError)
          return {
            ok: false,
            error:
              "We couldn’t identify a source-backed fact for this title. Edit the movie and add its year, language, or lead actor, then try again.",
          };
        return {
          ok: false,
          error:
            "We couldn’t get a movie fact right now. Please try again in a moment.",
        };
      }
      if (latest && sameFactText(text, latest.text))
        return { ok: true, fact: latest, source: "unchanged" };
      try {
        const fact = await deps.save({
          ...key,
          text,
          ...(citations ? { citations } : {}),
        });
        return { ok: true, fact, source: "generated" };
      } catch {
        if (latest) return { ok: true, fact: latest, source: "stale" };
        return {
          ok: false,
          error:
            "We couldn’t save your movie fact. Please try again in a moment.",
        };
      }
    });
    inFlight.set(lockKey, task);
    try {
      return await task;
    } finally {
      if (inFlight.get(lockKey) === task) inFlight.delete(lockKey);
    }
  };
}
export const generateAndSaveFact = createFactService();
