import { z } from 'zod';

// Een kind is 18 of jonger. Met alleen een geboortejaar kunnen we niet preciezer zijn dan het jaar.
const MAX_AGE = 18;

/**
 * De velden die een ouder invult voor een kind. Onbekende velden (zoals `parentId`) worden
 * weggehaald: de ouder mag nooit via de invoer gekozen worden.
 */
export const childBodySchema = z.object({
  // Ontbrekend, null, "" en "   " worden allemaal null, zodat "niet gedeeld" altijd hetzelfde
  // wordt opgeslagen.
  name: z
    .string()
    .trim()
    .max(100)
    .nullish()
    .transform((name) => name || null),
  birthYear: z
    .number()
    .int()
    // Functies in plaats van .min() en .max(), zodat de grenzen meeschuiven als er een nieuw
    // jaar begint.
    .refine((year) => year <= new Date().getFullYear(), 'Birth year cannot be in the future')
    .refine(
      (year) => year >= new Date().getFullYear() - MAX_AGE,
      `A child can be at most ${MAX_AGE} years old`,
    ),
});

// URL-parameters zijn altijd tekst, dus z.coerce maakt van "5" eerst 5.
export const parentIdParamsSchema = z.object({
  parentId: z.coerce.number().int().positive(),
});

export const childIdParamsSchema = parentIdParamsSchema.extend({
  id: z.coerce.number().int().positive(),
});

export type ChildInput = z.infer<typeof childBodySchema>;
