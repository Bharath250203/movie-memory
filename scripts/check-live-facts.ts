// Explicitly opt-in: makes four paid OpenAI web-search requests, no DB writes.
import "dotenv/config";
import { generateMovieFact } from "../src/lib/openai";
import { UnverifiedMovieError } from "../src/lib/fact-content";
if (process.env.RUN_LIVE_FACT_CHECK !== "1")
  throw new Error("Set RUN_LIVE_FACT_CHECK=1 to opt into paid API checks.");
for (const title of ["ANIMAL", "OG", "The Lord of the Rings", "John Wick"]) {
  try {
    const result = await generateMovieFact(title);
    console.log(JSON.stringify({ title, ...result }));
  } catch (error) {
    console.log(
      JSON.stringify({
        title,
        result:
          error instanceof UnverifiedMovieError
            ? "Needs clarification"
            : "Provider request failed",
        type: error instanceof Error ? error.name : "unknown",
      }),
    );
    process.exitCode = 1;
  }
}
