import { describe, expect, it } from "vitest";
import { movieSchema } from "@/lib/movie";
describe("server-side movie validation", () => {
  it("trims surrounding whitespace and preserves movie punctuation", () => {
    expect(movieSchema.parse("  WALL·E (2008)  ")).toBe("WALL·E (2008)");
  });
  it.each(["", "   ", "a".repeat(201), "movie\u0000title", null, 42])(
    "rejects invalid input %j",
    (input) => {
      expect(movieSchema.safeParse(input).success).toBe(false);
    },
  );
  it("accepts both length boundaries", () => {
    expect(movieSchema.safeParse("A").success).toBe(true);
    expect(movieSchema.safeParse("a".repeat(200)).success).toBe(true);
  });
});
