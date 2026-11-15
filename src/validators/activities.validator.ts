import { z } from 'zod';

import { CostFrequency, CostType, Setting, Weekday } from '../generated/prisma/enums';

// "HH:mm", 24-hour, e.g. "09:00" or "18:30".
const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use the HH:mm format, e.g. 18:30');

// Money is accepted as "12.50" (preferred) or 12.5 and kept as a string from here on. It is never
// turned into a JavaScript number, because numbers can't store most decimals exactly.
const amountSchema = z
  .union([z.string(), z.number()])
  .transform(String)
  .pipe(
    z.string().regex(/^\d{1,6}(\.\d{1,2})?$/, 'Amount must be 0 or more with at most 2 decimals'),
  );

const costItemSchema = z.object({
  // z.enum() with the Prisma enum rejects any value that is not in the database enum.
  type: z.enum(CostType),
  amount: amountSchema,
  frequency: z.enum(CostFrequency),
});

/**
 * Body for POST and PUT. PUT replaces the whole activity, so both use the same schema.
 * Unknown fields (such as `clubId`) are removed: the club always comes from the logged-in user.
 */
export const activityBodySchema = z
  .object({
    name: z.string().trim().min(3).max(120),
    description: z.string().trim().min(10).max(5000),
    sportId: z.number().int().positive(),
    minAge: z.number().int().min(0).max(99),
    maxAge: z.number().int().min(0).max(99),
    setting: z.enum(Setting),
    weekday: z.enum(Weekday),
    startTime: timeSchema,
    endTime: timeSchema,
    location: z.string().trim().min(3).max(200),
    // Required, but may be empty: an empty list means the activity is free.
    costItems: z.array(costItemSchema).max(20),
  })
  // Checks that compare two fields run after all fields are valid on their own.
  .refine((body) => body.minAge <= body.maxAge, {
    path: ['minAge'],
    message: 'minAge cannot be greater than maxAge',
  })
  // Text comparison works because both times are zero-padded "HH:mm".
  .refine((body) => body.startTime < body.endTime, {
    path: ['endTime'],
    message: 'endTime must be after startTime',
  });

// Query strings are always text, so z.coerce turns "8" into 8 first.
export const listActivitiesQuerySchema = z.object({
  sportId: z.coerce.number().int().positive().optional(),
  age: z.coerce.number().int().min(0).max(99).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export const activityIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type ActivityInput = z.infer<typeof activityBodySchema>;
export type ListActivitiesQuery = z.infer<typeof listActivitiesQuerySchema>;
