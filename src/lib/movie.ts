import { z } from "zod";
export const movieSchema = z
  .string({ error: "Enter a movie title." })
  .trim()
  .min(1, "Enter a movie title.")
  .max(200, "Keep your movie title to 200 characters or fewer.")
  .refine(
    (value) => !/[\u0000-\u001f\u007f]/.test(value),
    "Use a movie title without control characters.",
  );
export type MovieFormState = { error?: string };
