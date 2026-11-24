import { z } from 'zod';

import { passwordSchema } from './common.validator';

/**
 * Body for POST /api/parents. The email is trimmed and lowercased first, so "Ouder@Example.com"
 * and "ouder@example.com" count as the same account.
 */
export const registerParentSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  password: passwordSchema,
});

export type RegisterParentInput = z.infer<typeof registerParentSchema>;
