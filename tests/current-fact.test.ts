import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  generate: vi.fn(),
}));
vi.mock("@/lib/current-user", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/db", () => ({
  db: { fact: { findFirst: mocks.findFirst, create: mocks.create } },
}));
vi.mock("@/lib/openai", () => ({ generateMovieFact: mocks.generate }));
import { getCurrentFact } from "@/lib/current-fact";
beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireUser.mockResolvedValue({
    id: "session-owner",
    favoriteMovie: "Arrival",
  });
  mocks.findFirst.mockResolvedValue({
    text: "Owner's fact",
    movie: "Arrival",
    createdAt: new Date(),
  });
});
describe("fact authorization boundary", () => {
  it("rejects signed-out requests before any fact lookup or generation", async () => {
    mocks.requireUser.mockRejectedValueOnce(new Error("REDIRECT:/"));
    await expect(getCurrentFact()).rejects.toThrow("REDIRECT:/");
    expect(mocks.findFirst).not.toHaveBeenCalled();
    expect(mocks.generate).not.toHaveBeenCalled();
  });
  it("queries only the authenticated owner's current movie, newest first", async () => {
    // An attacker cannot select another user/movie through this no-argument entry point.
    const callWithForgedArguments = getCurrentFact as (
      ...args: unknown[]
    ) => ReturnType<typeof getCurrentFact>;
    await callWithForgedArguments({
      userId: "victim",
      movie: "Victim's movie",
    });
    expect(mocks.findFirst).toHaveBeenCalledWith({
      where: {
        userId: "session-owner",
        movie: "Arrival",
        generationVersion: 1,
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: { text: true, movie: true, createdAt: true, citations: true },
    });
    expect(mocks.generate).not.toHaveBeenCalled();
  });
  it("writes generated facts only to the session owner", async () => {
    mocks.findFirst.mockResolvedValueOnce(null);
    mocks.generate.mockResolvedValueOnce("New owner fact");
    mocks.create.mockResolvedValueOnce({
      text: "New owner fact",
      movie: "Arrival",
      createdAt: new Date(),
    });
    await getCurrentFact();
    expect(mocks.create).toHaveBeenCalledWith({
      data: {
        userId: "session-owner",
        movie: "Arrival",
        text: "New owner fact",
        citations: [],
        generationVersion: 1,
      },
      select: { text: true, movie: true, createdAt: true, citations: true },
    });
  });
});
