import { z } from 'zod';

// Schemas that several features use, so the same input is accepted or refused the same way
// everywhere.

// Query strings are always text, so z.coerce turns "8" into 8 first.
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export const idParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

/**
 * For every account type. At most 128 characters, so the server never hashes huge inputs. Not
 * trimmed: spaces are part of the password, but a password of only spaces is refused.
 */
export const passwordSchema = z
  .string()
  .min(8)
  .max(128)
  .refine((password) => password.trim().length > 0, 'Password cannot be only spaces');

/** Trimmed and lowercased first, so "Info@Club.nl" and "info@club.nl" are the same address. */
export const emailSchema = z.string().trim().toLowerCase().pipe(z.email().max(254));

/**
 * Makes a text field optional. A missing field, null, "" and "   " all become null, so "not filled
 * in" is always stored the same way (NULL) and an empty form field doesn't fail `min()`.
 */
export function optionalText<T extends z.ZodType<string>>(schema: T) {
  return z.preprocess(
    (value) => (value === undefined || (typeof value === 'string' && !value.trim()) ? null : value),
    schema.nullable(),
  );
}
