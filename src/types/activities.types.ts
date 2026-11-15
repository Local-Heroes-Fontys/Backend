import type { CostFrequency, CostType, Setting, Weekday } from '../generated/prisma/enums';

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
    email: string;
    phone: string | null;
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
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}
