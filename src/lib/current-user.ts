import "server-only";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";

export async function currentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      favoriteMovie: true,
    },
  });
}
export async function requireUser() {
  const user = await currentUser();
  if (!user) redirect("/");
  return user;
}
