"use client";
import { useRef, useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { updateMovie } from "@/app/actions";

export function EditMovie({ movie }: { movie: string }) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const editButton = useRef<HTMLButtonElement>(null);
  function close() {
    setEditing(false);
    setError(undefined);
    requestAnimationFrame(() => editButton.current?.focus());
  }
  if (!editing)
    return (
      <button
        ref={editButton}
        className="button-text edit-movie-button"
        onClick={() => setEditing(true)}
      >
        <Pencil size={14} /> Edit movie
      </button>
    );
  return (
    <form
      className="movie-form edit-movie-form"
      aria-label="Edit favorite movie"
      action={(form) => {
        startTransition(async () => {
          setError(undefined);
          try {
            const result = await updateMovie(form);
            if (result.error) setError(result.error);
            else close();
          } catch {
            setError("We couldn’t update your movie. Please try again.");
          }
        });
      }}
    >
      <label htmlFor="edit-movie">Movie title</label>
      <input
        id="edit-movie"
        name="movie"
        defaultValue={movie}
        autoFocus
        required
        maxLength={200}
        disabled={pending}
        aria-invalid={!!error}
        aria-describedby={error ? "edit-movie-error" : undefined}
        onKeyDown={(event) => {
          if (event.key === "Escape" && !pending) {
            event.preventDefault();
            close();
          }
        }}
      />
      {error && (
        <p id="edit-movie-error" className="error-message" role="alert">
          {error}
        </p>
      )}
      <p className="field-help">
        For similar titles, include the year, language, or lead actor.
      </p>
      <div className="edit-movie-actions">
        <button
          className="button button-primary"
          type="submit"
          disabled={pending}
        >
          {pending ? "Saving…" : "Save movie"}
        </button>
        <button
          className="button-text"
          type="button"
          disabled={pending}
          onClick={close}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
