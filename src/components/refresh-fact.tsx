"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { RotateCw } from "lucide-react";
export function RefreshFact({ retry = false }: { retry?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      className="button-text"
      disabled={pending}
      onClick={() => startTransition(() => router.refresh())}
    >
      <RotateCw size={15} className={pending ? "spin" : ""} />
      {pending ? "Finding a fact…" : retry ? "Try again" : "Refresh fact"}
    </button>
  );
}
