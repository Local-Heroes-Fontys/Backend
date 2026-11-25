import { z } from 'zod';

// EN: URL parameters are always text, so z.coerce first turns "5" into 5.
// NL: URL-parameters zijn altijd tekst, dus z.coerce maakt eerst van "5" het getal 5.
export const childParamsSchema = z.object({
  parentId: z.coerce.number().int().positive(),
  childId: z.coerce.number().int().positive(),
});

export const savedActivityParamsSchema = childParamsSchema.extend({
  activityId: z.coerce.number().int().positive(),
});
