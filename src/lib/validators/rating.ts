import { z } from "zod";

/**
 * A rating score must be in [1.0, 10.0] in steps of 0.5.
 * Mirrors the CHECK constraints in the `ratings` table.
 */
export const scoreSchema = z
  .number()
  .min(1, "La nota mínima es 1.0")
  .max(10, "La nota máxima es 10.0")
  .refine((v) => Math.round(v * 2) === v * 2, "El paso debe ser 0.5");

export const songRatingInputSchema = z.object({
  kind: z.literal("song"),
  songId: z.string().uuid(),
  score: scoreSchema,
});

export const albumRatingInputSchema = z.object({
  kind: z.literal("album_manual"),
  albumId: z.string().uuid(),
  score: scoreSchema,
});

export const ratingInputSchema = z.discriminatedUnion("kind", [
  songRatingInputSchema,
  albumRatingInputSchema,
]);

export type RatingInput = z.infer<typeof ratingInputSchema>;

/** Round any numeric input to the nearest 0.5. */
export function roundToHalf(value: number): number {
  return Math.round(value * 2) / 2;
}
