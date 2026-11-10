import "server-only";
import { requireUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { generateMovieFact } from "@/lib/openai";
import { generateAndSaveFact } from "@/lib/fact-service";
import { readCitations } from "@/lib/fact-content";

// Version 0 facts were generated without retrieval. Keep them as history, but
// never serve them as fresh or stale fallback after the source-backed upgrade.
export const FACT_GENERATION_VERSION = 1;
export async function getCurrentFact() {
  const user = await requireUser();
  return generateAndSaveFact(user, {
    latest: async ({ userId, movie }) => {
      const fact = await db.fact.findFirst({
        where: { userId, movie, generationVersion: FACT_GENERATION_VERSION },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: { text: true, movie: true, createdAt: true, citations: true },
      });
      return fact
        ? { ...fact, citations: readCitations(fact.citations, fact.text) }
        : null;
    },
    generate: generateMovieFact,
    save: async ({ citations = [], ...data }) => {
      const fact = await db.fact.create({
        data: {
          ...data,
          citations,
          generationVersion: FACT_GENERATION_VERSION,
        },
        select: { text: true, movie: true, createdAt: true, citations: true },
      });
      return { ...fact, citations: readCitations(fact.citations, fact.text) };
    },
  });
}
