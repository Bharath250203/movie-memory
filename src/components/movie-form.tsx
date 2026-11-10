"use client";
import { useActionState } from "react";
import { saveMovie } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
export function MovieForm() {
  const [state, action] = useActionState(saveMovie, {});
  return (
    <form action={action} className="movie-form">
      <label htmlFor="movie">Your favorite movie</label>
      <input
        id="movie"
        name="movie"
        placeholder="e.g. The Grand Budapest Hotel"
        required
        maxLength={200}
        autoFocus
        aria-describedby={state.error ? "movie-error movie-help" : "movie-help"}
        aria-invalid={!!state.error}
      />
      <p id="movie-help" className="field-help">
        Add the year, language, or lead actor to help identify the right film.
      </p>
      {state.error && (
        <p id="movie-error" role="alert" className="error-message">
          {state.error}
        </p>
      )}
      <SubmitButton pendingLabel="Saving your movie…">
        Save my movie
      </SubmitButton>
    </form>
  );
}
