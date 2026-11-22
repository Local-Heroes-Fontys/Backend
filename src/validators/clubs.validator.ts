import { z } from 'zod';

import {
  emailSchema,
  idParamsSchema,
  optionalText,
  paginationQuerySchema,
} from './common.validator';

// Digits, spaces, dashes and brackets, optionally starting with "+". At most 20 characters,
// e.g. "040 123 4567" or "+31 (0)40-1234567".
const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9][0-9 ()-]{5,18}$/, 'Use a phone number like 040 123 4567');

/**
 * The club details, for registering and for PUT (which replaces all of them, so leaving out an
 * optional field on PUT clears it). Only the name and address are required: a club may choose not
 * to share a description or contact details. Unknown fields (such as `approvalStatus`) are removed:
 * a club can't approve itself.
 */
export const clubBodySchema = z.object({
  name: z.string().trim().min(2).max(150),
  description: optionalText(z.string().trim().min(10).max(5000)),
  address: z.string().trim().min(5).max(255),
  contactName: optionalText(z.string().trim().min(2).max(100)),
  contactPhone: optionalText(phoneSchema),
  contactEmail: optionalText(emailSchema),
});

/** Body for POST /api/clubs: the club and the representative who manages it. */
export const registerClubBodySchema = z.object({
  club: clubBodySchema,
  representative: z.object({
    name: z.string().trim().min(2).max(100),
    email: emailSchema,
    password: z.string().min(8).max(128),
  }),
});

export const listClubsQuerySchema = paginationQuerySchema;
export const clubIdParamsSchema = idParamsSchema;

export type ClubInput = z.infer<typeof clubBodySchema>;
export type RegisterClubInput = z.infer<typeof registerClubBodySchema>;
export type ListClubsQuery = z.infer<typeof listClubsQuerySchema>;
