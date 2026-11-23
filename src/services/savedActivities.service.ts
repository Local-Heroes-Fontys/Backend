import { AppError } from '../errors/AppError';
import * as activitiesRepository from '../repositories/activities.repository';
import * as savedActivitiesRepository from '../repositories/savedActivities.repository';
import type { SavedActivityResponse } from '../types/savedActivities.types';

// There are no routes for this until parents can log in. `childId` must then be a child of the
// logged-in parent, never a value from the request, or anyone could read or change another
// family's saved activities.

export async function saveActivity(
  childId: number,
  activityId: number,
): Promise<SavedActivityResponse> {
  if (!(await activitiesRepository.findActivityById(activityId))) {
    throw new AppError(404, 'Activity not found');
  }
  const saved = await savedActivitiesRepository.saveActivity(childId, activityId);
  return toSavedActivityResponse(saved);
}

export async function removeSavedActivity(childId: number, activityId: number): Promise<void> {
  if (!(await savedActivitiesRepository.removeSavedActivity(childId, activityId))) {
    throw new AppError(404, 'This activity is not saved for this child');
  }
}

export async function listSavedActivities(childId: number): Promise<SavedActivityResponse[]> {
  const saved = await savedActivitiesRepository.findSavedActivities(childId);
  return saved.map(toSavedActivityResponse);
}

function toSavedActivityResponse(saved: {
  activityId: number;
  savedAt: Date;
}): SavedActivityResponse {
  return { activityId: saved.activityId, savedAt: saved.savedAt.toISOString() };
}
