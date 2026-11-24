import type { CostFrequency, CostType, Setting, Weekday } from '../generated/prisma/enums';

/**
 * The data the repository needs to save an activity. It is defined here, not taken from the
 * validator, so the database layer doesn't depend on what the HTTP request looks like.
 * The validated request (ActivityInput) has the same fields, so the service can pass it straight on.
 */
export interface ActivityData {
  name: string;
  description: string;
  sportId: number;
  minAge: number;
  maxAge: number;
  setting: Setting;
  weekday: Weekday;
  startTime: string;
  endTime: string;
  location: string;
  /** Amounts are decimal strings like "12.50", never JavaScript numbers. */
  costItems: { type: CostType; amount: string; frequency: CostFrequency }[];
}

// What the API sends back. These are separate from the database models on purpose: we choose
// exactly which fields leave the server, and a database change doesn't silently change the API.

export interface SportResponse {
  id: number;
  name: string;
}

export interface CostItemResponse {
  id: number;
  type: CostType;
  /** Euros as a string with 2 decimals, e.g. "12.50", so no precision is lost in JSON. */
  amount: string;
  frequency: CostFrequency;
}

export interface ActivityResponse {
  id: number;
  name: string;
  description: string;
  sport: SportResponse;
  club: {
    id: number;
    name: string;
    address: string;
    /** null = the club chose not to share it. */
    contactName: string | null;
    contactPhone: string | null;
    contactEmail: string | null;
  };
  minAge: number;
  maxAge: number;
  setting: Setting;
  weekday: Weekday;
  startTime: string;
  endTime: string;
  location: string;
  /** Empty list = free activity. There is deliberately no total, see README. */
  costItems: CostItemResponse[];
  /** ISO 8601 timestamps, e.g. "2026-11-15T10:18:25.000Z". */
  createdAt: string;
  updatedAt: string;
}
