import { z } from "zod";
export const citationSchema = z.object({
  url: z
    .string()
    .url()
    .refine((value) => {
      const url = new URL(value);
      return (
        ["https:", "http:"].includes(url.protocol) &&
        !url.username &&
        !url.password
      );
    }),
  title: z.string().min(1),
  start: z.number().int().nonnegative(),
  end: z.number().int().positive(),
});
export type FactCitation = z.infer<typeof citationSchema>;
export type GeneratedFact = { text: string; citations: FactCitation[] };
export class UnverifiedMovieError extends Error {}
export function readCitations(value: unknown, text: string): FactCitation[] {
  const parsed = z.array(citationSchema).safeParse(value);
  if (!parsed.success) return [];
  let end = 0;
  return parsed.data
    .sort((a, b) => a.start - b.start)
    .filter((citation) => {
      if (
        citation.start < end ||
        citation.end <= citation.start ||
        citation.end > text.length
      )
        return false;
      end = citation.end;
      return true;
    });
}

export class NoDifferentFactError extends Error {}

// Ignore citation formatting, case and punctuation; this catches repeated text,
// not every semantic paraphrase. The generation prompt also rejects paraphrases.
export function sameFactText(a: string, b: string): boolean {
  const normalize = (text: string) =>
    text
      .replace(/\[[^\]]*\]\(https?:\/\/[^\s]*?\)/g, "")
      .replace(/[^]*/g, "")
      .replace(/\[\d+\]/g, "")
      .normalize("NFKC")
      .toLocaleLowerCase("en")
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim();
  return normalize(a) === normalize(b);
}
