import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), findUnique: vi.fn() }));
vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/db", () => ({ db: { user: { findUnique: mocks.findUnique } } }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
}));
import { currentUser, requireUser } from "@/lib/current-user";
beforeEach(() => {
  mocks.auth.mockResolvedValue(null);
  mocks.findUnique.mockResolvedValue(null);
});
describe("current user authorization", () => {
  it("returns no user and makes no DB query without a session", async () => {
    expect(await currentUser()).toBeNull();
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });
  it("selects only the session owner's profile", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "owner" } });
    await currentUser();
    expect(mocks.findUnique).toHaveBeenCalledWith({
      where: { id: "owner" },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        favoriteMovie: true,
      },
    });
  });
  it("redirects unauthenticated requests", async () => {
    await expect(requireUser()).rejects.toThrow("REDIRECT:/");
  });
  it("rejects a session whose user no longer exists", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "deleted" } });
    await expect(requireUser()).rejects.toThrow("REDIRECT:/");
  });
});
