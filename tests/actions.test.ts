import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  updateMany: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  revalidatePath: vi.fn(),
}));
vi.mock("@/auth", () => ({ signIn: mocks.signIn, signOut: mocks.signOut }));
vi.mock("@/lib/current-user", () => ({ requireUser: mocks.requireUser }));
vi.mock("@/lib/db", () => ({ db: { user: { updateMany: mocks.updateMany } } }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
import { saveMovie, updateMovie } from "@/app/actions";
beforeEach(() => {
  mocks.requireUser.mockResolvedValue({ id: "user-a" });
  mocks.updateMany.mockResolvedValue({ count: 1 });
});
describe("onboarding action", () => {
  it("rejects logged-out submissions before any write", async () => {
    mocks.requireUser.mockRejectedValue(new Error("REDIRECT:/"));
    await expect(saveMovie({}, new FormData())).rejects.toThrow("REDIRECT:/");
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });
  it("ignores a forged userId and saves only for the authenticated user", async () => {
    const data = new FormData();
    data.set("movie", "  Arrival  ");
    data.set("userId", "user-b");
    await expect(saveMovie({}, data)).rejects.toThrow("REDIRECT:/dashboard");
    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: { id: "user-a", favoriteMovie: null },
      data: { favoriteMovie: "Arrival" },
    });
  });
  it("rejects whitespace server-side without writing", async () => {
    const data = new FormData();
    data.set("movie", " ");
    expect(await saveMovie({}, data)).toEqual({
      error: "Enter a movie title.",
    });
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });
  it("returns recoverable errors when storage fails", async () => {
    mocks.updateMany.mockRejectedValue(new Error("sensitive connection data"));
    const data = new FormData();
    data.set("movie", "Arrival");
    expect(await saveMovie({}, data)).toEqual({
      error: "We couldn’t save your movie. Please try again.",
    });
  });
});

describe("edit movie action", () => {
  it("validates before writing", async () => {
    const form = new FormData();
    form.set("movie", "   ");
    expect(await updateMovie(form)).toEqual({ error: "Enter a movie title." });
    expect(mocks.updateMany).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
  it("rejects unauthenticated editing", async () => {
    mocks.requireUser.mockRejectedValueOnce(new Error("REDIRECT:/"));
    await expect(updateMovie(new FormData())).rejects.toThrow("REDIRECT:/");
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });
  it("trims the new title, ignores forged identity, and refreshes the dashboard", async () => {
    const form = new FormData();
    form.set("movie", "  Interstellar  ");
    form.set("userId", "victim");
    expect(await updateMovie(form)).toEqual({});
    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: { id: "user-a" },
      data: { favoriteMovie: "Interstellar" },
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard");
  });
  it("preserves the view on write failure without leaking details", async () => {
    mocks.updateMany.mockRejectedValueOnce(new Error("DB secret"));
    const form = new FormData();
    form.set("movie", "Arrival");
    expect(await updateMovie(form)).toEqual({
      error: "We couldn’t update your movie. Please try again.",
    });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
  it("reports a user removed during editing", async () => {
    mocks.updateMany.mockResolvedValueOnce({ count: 0 });
    const form = new FormData();
    form.set("movie", "Arrival");
    expect((await updateMovie(form)).error).toBeDefined();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
