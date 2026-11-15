import { AppError } from '../errors/AppError';
import * as activitiesRepository from '../repositories/activities.repository';
import type { ActivityWithRelations } from '../repositories/activities.repository';
import { findSportById } from '../repositories/sports.repository';
import type { ActivityResponse, PaginatedResponse } from '../types/activities.types';
import type { AuthenticatedRepresentative } from '../types/auth.types';
import type { ActivityInput, ListActivitiesQuery } from '../validators/activities.validator';

export async function listActivities(
  query: ListActivitiesQuery,
): Promise<PaginatedResponse<ActivityResponse>> {
  const { page, pageSize, sportId, age } = query;
  const { activities, total } = await activitiesRepository.findActivities({
    sportId,
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
  await findOwnActivity(id, representative);
  await assertSportExists(input.sportId);
  const activity = await activitiesRepository.updateActivity(id, input);
  return toActivityResponse(activity);
}

export async function deleteActivity(
  id: number,
  representative: AuthenticatedRepresentative,
): Promise<void> {
  await findOwnActivity(id, representative);
  await activitiesRepository.deleteActivity(id);
}

/** 404 if the activity doesn't exist, 403 if it belongs to another club. */
async function findOwnActivity(id: number, representative: AuthenticatedRepresentative) {
  const activity = await activitiesRepository.findActivityById(id);
  if (!activity) {
    throw new AppError(404, 'Activity not found');
  }
  if (activity.clubId !== representative.clubId) {
    throw new AppError(403, 'You can only change activities of your own club');
  }
  return activity;
}

// Clubs choose from the existing sports. They can never create a new one through an activity.
async function assertSportExists(sportId: number) {
  const sport = await findSportById(sportId);
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
      email: club.email,
      phone: club.phone,
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
  };
}
