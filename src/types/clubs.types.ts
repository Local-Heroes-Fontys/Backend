import type { ApprovalStatus } from '../generated/prisma/enums';

/** The club fields a representative fills in, both when registering and when editing. */
export interface ClubData {
  name: string;
  /** null = the club chose not to share it. Same for the contact fields. */
  description: string | null;
  address: string;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
}

/** What the repository needs to save a representative. Only ever a hash, never the password. */
export interface NewRepresentativeData {
  name: string;
  email: string;
  passwordHash: string;
}

// What the API sends back. Like the activity responses, these are separate from the database
// models on purpose, so a password hash can never leak by accident.

export interface ClubResponse {
  id: number;
  name: string;
  /** null = the club chose not to share it. Same for the contact fields. */
  description: string | null;
  address: string;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  /** New clubs are PENDING. Reviewing clubs is a separate feature. */
  approvalStatus: ApprovalStatus;
}

export interface RepresentativeResponse {
  id: number;
  name: string;
  email: string;
}

export interface RegisterClubResponse {
  club: ClubResponse;
  representative: RepresentativeResponse;
}
