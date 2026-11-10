import { UnverifiedMovieError, NoDifferentFactError } from "@/lib/fact-content";
import { describe, expect, it, vi } from "vitest";
import { createFactService, type StoredFact } from "@/lib/fact-service";
const user = { id: "user-a", favoriteMovie: "WALL·E" };
const now = 100_000;
function dependencies(age?: number) {
  const fact =
    age === undefined
      ? null
      : {
          text: "Saved fact",
          movie: user.favoriteMovie,
          createdAt: new Date(now - age),
        };
  return {
    latest: vi.fn().mockResolvedValue(fact),
    generate: vi.fn().mockResolvedValue("  A movie fact.  "),
    save: vi.fn().mockImplementation(async (data) => ({
      ...data,
      createdAt: new Date(now),
    })),
    now: () => now,
  };
}
describe("Variant A fact service", () => {
  it.each([0, 59_999])(
    "reuses a fact aged %i ms without generating or writing",
    async (age) => {
      const deps = dependencies(age);
      const result = await createFactService()(user, deps);
      expect(result).toMatchObject({
        ok: true,
        source: "cached",
        fact: { text: "Saved fact" },
      });
      expect(deps.latest).toHaveBeenCalledWith({
        userId: user.id,
        movie: user.favoriteMovie,
      });
      expect(deps.generate).not.toHaveBeenCalled();
      expect(deps.save).not.toHaveBeenCalled();
    },
  );
  it.each([60_000, 60_001, undefined])(
    "generates and persists when cache age is %s",
    async (age) => {
      const deps = dependencies(age);
      const result = await createFactService()(user, deps);
      expect(result).toMatchObject({ ok: true, source: "generated" });
      expect(deps.generate).toHaveBeenCalledWith(
        ...(age === undefined
          ? [user.favoriteMovie]
          : [user.favoriteMovie, "Saved fact"]),
      );
      expect(deps.save).toHaveBeenCalledWith({
        userId: user.id,
        movie: user.favoriteMovie,
        text: "A movie fact.",
      });
    },
  );
  it("does not extend cache lifetime on reads", async () => {
    const deps = dependencies(59_999);
    const service = createFactService();
    await service(user, deps);
    deps.now = () => now + 1;
    expect(await service(user, deps)).toMatchObject({ source: "generated" });
  });
  it("coalesces a burst of concurrent requests and releases its lock", async () => {
    const deps = dependencies();
    let release!: (text: string) => void;
    deps.generate.mockImplementation(
      () =>
        new Promise<string>((resolve) => {
          release = resolve;
        }),
    );
    const service = createFactService();
    const requests = Array.from({ length: 20 }, () => service(user, deps));
    await vi.waitFor(() => expect(deps.generate).toHaveBeenCalledTimes(1));
    release("One fact for the burst");
    const results = await Promise.all(requests);
    expect(results.every((result) => result === results[0])).toBe(true);
    expect(deps.latest).toHaveBeenCalledTimes(1);
    expect(deps.save).toHaveBeenCalledTimes(1);
    deps.latest.mockResolvedValue({
      text: "One fact for the burst",
      movie: user.favoriteMovie,
      createdAt: new Date(now),
    });
    expect(await service(user, deps)).toMatchObject({ source: "cached" });
    expect(deps.latest).toHaveBeenCalledTimes(2);
  });
  it("isolates locks by user AND movie", async () => {
    const deps = dependencies();
    const service = createFactService();
    await Promise.all([
      service(user, deps),
      service({ ...user, id: "user-b" }, deps),
      service({ ...user, favoriteMovie: "Arrival" }, deps),
    ]);
    expect(deps.generate).toHaveBeenCalledTimes(3);
    expect(deps.latest.mock.calls.map(([key]) => key)).toEqual([
      { userId: "user-a", movie: "WALL·E" },
      { userId: "user-b", movie: "WALL·E" },
      { userId: "user-a", movie: "Arrival" },
    ]);
  });
  it("uses only the requested user's movie cache", async () => {
    const deps = dependencies();
    const records = new Map<string, StoredFact>([
      [
        JSON.stringify(["user-b", "WALL·E"]),
        {
          text: "Private other fact",
          movie: "WALL·E",
          createdAt: new Date(now),
        },
      ],
    ]);
    deps.latest.mockImplementation(
      async (key) =>
        records.get(JSON.stringify([key.userId, key.movie])) ?? null,
    );
    const result = await createFactService()(user, deps);
    expect(JSON.stringify(result)).not.toContain("Private other fact");
    expect(result).toMatchObject({ source: "generated" });
  });
  it.each([new Error("timeout"), new Error("private API response")])(
    "returns stale fact on provider error without changing its timestamp",
    async (error) => {
      const deps = dependencies(90_000);
      deps.generate.mockRejectedValue(error);
      expect(await createFactService()(user, deps)).toEqual({
        ok: true,
        source: "stale",
        fact: {
          text: "Saved fact",
          movie: user.favoriteMovie,
          createdAt: new Date(10_000),
        },
      });
      expect(deps.save).not.toHaveBeenCalled();
    },
  );
  it("returns a safe error without a fallback and permits retry after failure", async () => {
    const deps = dependencies();
    deps.generate.mockRejectedValueOnce(new Error("secret provider payload"));
    const service = createFactService();
    const result = await service(user, deps);
    expect(result.ok).toBe(false);
    expect(JSON.stringify(result)).not.toContain("secret provider payload");
    expect(await service(user, deps)).toMatchObject({
      ok: true,
      source: "generated",
    });
  });
  it.each(["   ", "x".repeat(2001)])(
    "rejects invalid provider output",
    async (text) => {
      const deps = dependencies();
      deps.generate.mockResolvedValue(text);
      expect((await createFactService()(user, deps)).ok).toBe(false);
      expect(deps.save).not.toHaveBeenCalled();
    },
  );
  it("does not call storage or OpenAI before onboarding", async () => {
    const deps = dependencies();
    expect(
      (await createFactService()({ ...user, favoriteMovie: null }, deps)).ok,
    ).toBe(false);
    expect(deps.latest).not.toHaveBeenCalled();
    expect(deps.generate).not.toHaveBeenCalled();
  });
  it("fails safely on a database read error and releases the lock", async () => {
    const deps = dependencies();
    deps.latest.mockRejectedValueOnce(new Error("DB password"));
    const service = createFactService();
    expect(await service(user, deps)).toEqual({
      ok: false,
      error: "We couldn’t load your movie fact. Please try again.",
    });
    expect(deps.generate).not.toHaveBeenCalled();
    expect(await service(user, deps)).toMatchObject({ source: "generated" });
  });
  it("never reports an unsaved generated fact as saved", async () => {
    const deps = dependencies();
    deps.save.mockRejectedValue(new Error("DB password"));
    expect(await createFactService()(user, deps)).toEqual({
      ok: false,
      error: "We couldn’t save your movie fact. Please try again in a moment.",
    });
  });
  it("can preserve an older saved fact when saving fails", async () => {
    const deps = dependencies(90_000);
    deps.save.mockRejectedValue(new Error("DB password"));
    expect(await createFactService()(user, deps)).toMatchObject({
      source: "stale",
      fact: { text: "Saved fact" },
    });
  });
});

it("does not save an unsupported film response and offers clarification", async () => {
  const deps = dependencies();
  deps.generate.mockRejectedValue(new UnverifiedMovieError());
  expect(await createFactService()(user, deps)).toMatchObject({
    ok: false,
    error: expect.stringContaining("year, language, or lead actor"),
  });
  expect(deps.save).not.toHaveBeenCalled();
});
it("preserves source citations when saving a new fact", async () => {
  const citations = [
    { url: "https://example.com", title: "Source", start: 5, end: 8 },
  ];
  const deps = dependencies();
  deps.generate.mockResolvedValue({ text: "Fact [1]", citations });
  await createFactService()(user, deps);
  expect(deps.save).toHaveBeenCalledWith({
    userId: user.id,
    movie: user.favoriteMovie,
    text: "Fact [1]",
    citations,
  });
});

it("passes the previous fact and does not save an identical response", async () => {
  const deps = dependencies(61_000);
  deps.generate.mockResolvedValue("Saved fact");
  const result = await createFactService()(user, deps);
  expect(deps.generate).toHaveBeenCalledWith(user.favoriteMovie, "Saved fact");
  expect(result).toMatchObject({
    source: "unchanged",
    fact: { text: "Saved fact", createdAt: new Date(now - 61_000) },
  });
  expect(deps.save).not.toHaveBeenCalled();
});
it("does not treat citation or punctuation changes as a new fact", async () => {
  const deps = dependencies(61_000);
  deps.generate.mockResolvedValue(
    "SAVED FACT! ([source](https://example.com/new))",
  );
  expect(await createFactService()(user, deps)).toMatchObject({
    source: "unchanged",
  });
  expect(deps.save).not.toHaveBeenCalled();
});
it("handles no different fact without a write and permits a later attempt", async () => {
  const deps = dependencies(61_000);
  const service = createFactService();
  deps.generate.mockRejectedValueOnce(new NoDifferentFactError());
  expect(await service(user, deps)).toMatchObject({ source: "unchanged" });
  expect(deps.save).not.toHaveBeenCalled();
  expect(await service(user, deps)).toMatchObject({ source: "generated" });
});
