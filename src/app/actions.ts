"use server";
import { signIn, signOut } from "@/auth";
import { requireUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { movieSchema, type MovieFormState } from "@/lib/movie";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function login() {
  if (!process.env.AUTH_GOOGLE_ID || !process.env.AUTH_GOOGLE_SECRET)
    redirect("/?error=Configuration");
  await signIn("google", { redirectTo: "/dashboard" });
}
export async function logout() {
  await signOut({ redirectTo: "/" });
}

export async function saveMovie(
  _previous: MovieFormState,
  form: FormData,
): Promise<MovieFormState> {
  const user = await requireUser();
  const parsed = movieSchema.safeParse(form.get("movie"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  try {
    // First-time-only: concurrent submissions cannot overwrite an already saved movie.
    await db.user.updateMany({
      where: { id: user.id, favoriteMovie: null },
      data: { favoriteMovie: parsed.data },
    });
  } catch {
    return { error: "We couldn’t save your movie. Please try again." };
  }
  redirect("/dashboard");
}

export async function updateMovie(form: FormData): Promise<MovieFormState> {
  const user = await requireUser();
  const parsed = movieSchema.safeParse(form.get("movie"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  try {
    const updated = await db.user.updateMany({
      where: { id: user.id },
      data: { favoriteMovie: parsed.data },
    });
    if (updated.count !== 1)
      return { error: "We couldn’t update your movie. Please try again." };
  } catch {
    return { error: "We couldn’t update your movie. Please try again." };
  }
  revalidatePath("/dashboard");
  return {};
}
