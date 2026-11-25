import { AppError } from '../errors/AppError';
import * as activitiesRepository from '../repositories/activities.repository';
import * as childrenRepository from '../repositories/children.repository';
import * as savedActivitiesRepository from '../repositories/savedActivities.repository';
import type { SavedActivityResponse } from '../types/savedActivities.types';

// EN: For now the parent comes from the URL, just like for children. Every function first checks
// that the child belongs to that parent. Once parents can log in, a check is added that the
// logged-in parent is this parent.
// NL: Voor nu komt de ouder uit de URL, net als bij kinderen. Elke functie controleert eerst of
// het kind bij die ouder hoort. Zodra ouders kunnen inloggen, komt er een controle bij dat de
// ingelogde ouder deze ouder is.

export async function saveActivity(
  parentId: number,
  childId: number,
  activityId: number,
): Promise<SavedActivityResponse> {
  await assertOwnChild(parentId, childId);
  if (!(await activitiesRepository.findActivityById(activityId))) {
    throw new AppError(404, 'Activity not found');
  }
  const saved = await savedActivitiesRepository.saveActivity(childId, activityId);
  return toSavedActivityResponse(saved);
}

export async function removeSavedActivity(
  parentId: number,
  childId: number,
  activityId: number,
): Promise<void> {
  await assertOwnChild(parentId, childId);
  if (!(await savedActivitiesRepository.removeSavedActivity(childId, activityId))) {
    throw new AppError(404, 'This activity is not saved for this child');
  }
}

export async function listSavedActivities(
  parentId: number,
  childId: number,
): Promise<SavedActivityResponse[]> {
  await assertOwnChild(parentId, childId);
  const saved = await savedActivitiesRepository.findSavedActivities(childId);
  return saved.map(toSavedActivityResponse);
}

// EN: Same message for a child of another parent, so we don't reveal that the child exists.
// NL: Zelfde melding voor een kind van een andere ouder, zodat we niet verraden dat het kind bestaat.
async function assertOwnChild(parentId: number, childId: number) {
  if (!(await childrenRepository.findOwnChild(parentId, childId))) {
    throw new AppError(404, 'Child not found');
  }
}

function toSavedActivityResponse(saved: {
  activityId: number;
  savedAt: Date;
}): SavedActivityResponse {
  return { activityId: saved.activityId, savedAt: saved.savedAt.toISOString() };
}
