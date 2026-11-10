import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("openai", () => ({
  default: class {
    responses = { create: mocks.create };
  },
}));
import { generateMovieFact } from "@/lib/openai";
import {
  UnverifiedMovieError,
  NoDifferentFactError,
  readCitations,
} from "@/lib/fact-content";
const citation = {
  type: "url_citation",
  url: "https://example.com/film",
  title: "Film source",
  start_index: 12,
  end_index: 15,
};
function response(
  text = "A film fact.[1]",
  annotations: unknown[] = [citation],
) {
  return {
    status: "completed",
    output: [
      { type: "web_search_call", status: "completed" },
      {
        type: "message",
        content: [{ type: "output_text", text, annotations }],
      },
    ],
  };
}
beforeEach(() => {
  vi.stubEnv("OPENAI_API_KEY", "test-key");
  mocks.create.mockResolvedValue(response());
});
describe("source-backed movie generation", () => {
  it("requires web search, keeps the title as data, and preserves citation offsets", async () => {
    expect(await generateMovieFact("ANIMAL")).toEqual({
      text: "A film fact.[1]",
      citations: [
        { url: citation.url, title: citation.title, start: 12, end: 15 },
      ],
    });
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tool_choice: "required",
        tools: [{ type: "web_search", search_context_size: "low" }],
        input: expect.stringContaining('"movieTitle":"ANIMAL"'),
        store: false,
      }),
    );
  });
  it("rejects an unsupported uncited answer", async () => {
    mocks.create.mockResolvedValue(response("Generic invented story", []));
    await expect(generateMovieFact("OG")).rejects.toBeInstanceOf(
      UnverifiedMovieError,
    );
  });
  it("asks for clarification instead of storing uncertain output", async () => {
    mocks.create.mockResolvedValue(response("NEEDS_CLARIFICATION", []));
    await expect(generateMovieFact("Unknown")).rejects.toBeInstanceOf(
      UnverifiedMovieError,
    );
  });
  it("rejects citations if search did not run", async () => {
    const r = response();
    r.output.shift();
    mocks.create.mockResolvedValue(r);
    await expect(generateMovieFact("Animal")).rejects.toBeInstanceOf(
      UnverifiedMovieError,
    );
  });
  it("does not accept incomplete output", async () => {
    mocks.create.mockResolvedValue({ ...response(), status: "incomplete" });
    await expect(generateMovieFact("Animal")).rejects.toThrow(
      "Incomplete response",
    );
  });
  it("rejects unsafe links and out-of-range citation positions", () => {
    expect(
      readCitations(
        [{ url: "javascript:alert(1)", title: "bad", start: 0, end: 1 }],
        "abc",
      ),
    ).toEqual([]);
    expect(
      readCitations(
        [{ url: "https://example.com", title: "bad", start: 0, end: 99 }],
        "abc",
      ),
    ).toEqual([]);
  });
});

it("sends the previous fact as context for a different answer", async () => {
  await generateMovieFact("OG", "Sony Music acquired the music rights.");
  const input = JSON.parse(mocks.create.mock.calls[0][0].input);
  expect(input.previousFact).toBe("Sony Music acquired the music rights.");
  expect(input.refreshRequirement).toContain("different sourced fact");
});
it("recognizes an explicit no-different-fact response", async () => {
  mocks.create.mockResolvedValue(response("NO_DIFFERENT_FACT", []));
  await expect(generateMovieFact("OG", "Previous fact")).rejects.toBeInstanceOf(
    NoDifferentFactError,
  );
});
