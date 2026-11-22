import { z } from 'zod';

// A child is 18 or younger. With only a year we can't be more precise than the calendar year.
const MAX_AGE = 18;

/**
 * Body for POST /api/children. Unknown fields (such as `parentId`) are removed: the parent always
 * comes from the logged-in user.
 */
export const childBodySchema = z.object({
  // Missing, null, "" and "   " all become null, so "not shared" is always stored the same way.
  name: z
    .string()
    .trim()
    .max(100)
    .nullish()
    .transform((name) => name || null),
  birthYear: z
    .number()
    .int()
    // Functions instead of .min() and .max(), so the limits move along when a new year starts.
    .refine((year) => year <= new Date().getFullYear(), 'Birth year cannot be in the future')
    .refine(
      (year) => year >= new Date().getFullYear() - MAX_AGE,
      `A child can be at most ${MAX_AGE} years old`,
    ),
});

export type ChildInput = z.infer<typeof childBodySchema>;
