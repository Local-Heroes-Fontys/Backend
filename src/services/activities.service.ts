import { AppError } from '../errors/AppError';
import * as activitiesRepository from '../repositories/activities.repository';
import type { ActivityWithRelations } from '../repositories/activities.repository';
import * as sportsRepository from '../repositories/sports.repository';
import type { ActivityResponse } from '../types/activities.types';
import type { AuthenticatedRepresentative } from '../types/auth.types';
import type { PaginatedResponse } from '../types/common.types';
import type { ActivityInput, ListActivitiesQuery } from '../validators/activities.validator';

// NOTE: the list returns the full activity (description, club contact, all cost items) for every
// item. That keeps this example simple. Later, when the frontend knows what its cards show, add a
// smaller summary response for the list and keep the full response for GET /activities/:id.
export async function listActivities(
  query: ListActivitiesQuery,
): Promise<PaginatedResponse<ActivityResponse>> {
  const { page, pageSize, sportId, clubId, age } = query;
  const { activities, total } = await activitiesRepository.findActivities({
    sportId,
    clubId,
    age,
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  return {
    data: activities.map(toActivityResponse),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
}

export async function getActivity(id: number): Promise<ActivityResponse> {
  const activity = await activitiesRepository.findActivityById(id);
  if (!activity) {
    throw new AppError(404, 'Activity not found');
  }
  return toActivityResponse(activity);
}

export async function createActivity(
  input: ActivityInput,
  representative: AuthenticatedRepresentative,
): Promise<ActivityResponse> {
  await assertSportExists(input.sportId);
  // The club comes from the logged-in representative, never from the request body.
  const activity = await activitiesRepository.createActivity(representative.clubId, input);
  return toActivityResponse(activity);
}

export async function updateActivity(
  id: number,
  input: ActivityInput,
  representative: AuthenticatedRepresentative,
): Promise<ActivityResponse> {
  await assertSportExists(input.sportId);
  const activity = await activitiesRepository.updateOwnActivity(id, representative.clubId, input);
  if (!activity) {
    throw await notFoundOrForbidden(id);
  }
  return toActivityResponse(activity);
}

export async function deleteActivity(
  id: number,
  representative: AuthenticatedRepresentative,
): Promise<void> {
  const deleted = await activitiesRepository.deleteOwnActivity(id, representative.clubId);
  if (!deleted) {
    throw await notFoundOrForbidden(id);
  }
}

/**
 * Called only after an update or delete matched nothing, to pick the right error:
 * 404 if the activity doesn't exist, 403 if it exists but belongs to another club.
 */
async function notFoundOrForbidden(id: number): Promise<AppError> {
  const activity = await activitiesRepository.findActivityById(id);
  return activity
    ? new AppError(403, 'You can only change activities of your own club')
    : new AppError(404, 'Activity not found');
}

// Clubs choose from the existing sports. They can never create a new one through an activity.
async function assertSportExists(sportId: number) {
  const sport = await sportsRepository.findSportById(sportId);
  if (!sport) {
    throw new AppError(400, `Sport ${sportId} does not exist`);
  }
}

/** Turns the database record into the API response (DTO). */
function toActivityResponse(activity: ActivityWithRelations): ActivityResponse {
  const { sport, club } = activity;
  return {
    id: activity.id,
    name: activity.name,
    description: activity.description,
    sport: { id: sport.id, name: sport.name },
    club: {
      id: club.id,
      name: club.name,
      address: club.address,
      contactName: club.contactName,
      contactPhone: club.contactPhone,
      contactEmail: club.contactEmail,
    },
    minAge: activity.minAge,
    maxAge: activity.maxAge,
    setting: activity.setting,
    weekday: activity.weekday,
    startTime: activity.startTime,
    endTime: activity.endTime,
    location: activity.location,
    costItems: activity.costItems.map((item) => ({
      id: item.id,
      type: item.type,
      // Prisma returns DECIMAL columns as Decimal objects. toFixed(2) gives an exact string.
      amount: item.amount.toFixed(2),
      frequency: item.frequency,
    })),
    createdAt: activity.createdAt.toISOString(),
    updatedAt: activity.updatedAt.toISOString(),
  };
}
