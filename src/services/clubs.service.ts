import { AppError } from '../errors/AppError';
import { Prisma } from '../generated/prisma/client';
import type { SportsClub } from '../generated/prisma/client';
import * as clubRepresentativesRepository from '../repositories/clubRepresentatives.repository';
import * as clubsRepository from '../repositories/clubs.repository';
import type { AuthenticatedRepresentative } from '../types/auth.types';
import type { ClubResponse, RegisterClubResponse } from '../types/clubs.types';
import type { PaginatedResponse } from '../types/common.types';
import type { ClubInput, ListClubsQuery, RegisterClubInput } from '../validators/clubs.validator';
import * as passwordService from './password.service';

const EMAIL_TAKEN = 'A club representative with this email already exists';

/** Saves a new club (status PENDING) together with its first representative. */
export async function registerClub(input: RegisterClubInput): Promise<RegisterClubResponse> {
  const { club, representative } = input;
  if (await clubRepresentativesRepository.findRepresentativeByEmail(representative.email)) {
    throw new AppError(409, EMAIL_TAKEN);
  }

  try {
    const created = await clubsRepository.createClubWithRepresentative(club, {
      name: representative.name,
      email: representative.email,
      passwordHash: await passwordService.hashPassword(representative.password),
    });
    return {
      club: toClubResponse(created.club),
      // Built by hand, so the password hash never leaves the server.
      representative: { id: created.id, name: created.name, email: created.email },
    };
  } catch (err) {
    // Two requests with the same email at the same time both pass the check above; the unique
    // index then refuses the second one.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new AppError(409, EMAIL_TAKEN);
    }
    throw err;
  }
}

// NOTE: all clubs are listed, whatever their approval status, just like their activities. Hiding
// clubs that are not approved belongs to the club review feature.
export async function listClubs(query: ListClubsQuery): Promise<PaginatedResponse<ClubResponse>> {
  const { page, pageSize } = query;
  const { clubs, total } = await clubsRepository.findClubs({
    skip: (page - 1) * pageSize,
    take: pageSize,
  });
  return {
    data: clubs.map(toClubResponse),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
}

export async function getClub(id: number): Promise<ClubResponse> {
  const club = await clubsRepository.findClubById(id);
  if (!club) {
    throw new AppError(404, 'Club not found');
  }
  return toClubResponse(club);
}

/** Replaces the club details. Only a representative of the club itself may do this. */
export async function updateClub(
  id: number,
  input: ClubInput,
  representative: AuthenticatedRepresentative,
): Promise<ClubResponse> {
  // The representative's club is read from the database on every request (see
  // requireClubRepresentative), so this comparison is enough.
  if (id !== representative.clubId) {
    throw (await clubsRepository.findClubById(id))
      ? new AppError(403, 'You can only change your own club')
      : new AppError(404, 'Club not found');
  }
  return toClubResponse(await clubsRepository.updateClub(id, input));
}

/** Turns the database record into the API response (DTO). */
function toClubResponse(club: SportsClub): ClubResponse {
  return {
    id: club.id,
    name: club.name,
    description: club.description,
    address: club.address,
    contactName: club.contactName,
    contactPhone: club.contactPhone,
    contactEmail: club.contactEmail,
    approvalStatus: club.approvalStatus,
  };
}
