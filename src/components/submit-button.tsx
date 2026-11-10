"use client";
import { useFormStatus } from "react-dom";
import { ArrowUpRight, LoaderCircle } from "lucide-react";
export function SubmitButton({
  children,
  pendingLabel,
  className = "button-primary",
}: {
  children: React.ReactNode;
  pendingLabel: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? (
        <>
          <LoaderCircle size={18} className="spin" />
          {pendingLabel}
        </>
      ) : (
        <>
          {children}
          <ArrowUpRight size={18} />
        </>
      )}
    </button>
  );
}
