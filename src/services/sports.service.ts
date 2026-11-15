import * as sportsRepository from '../repositories/sports.repository';
import type { SportResponse } from '../types/activities.types';

export async function listSports(): Promise<SportResponse[]> {
  const sports = await sportsRepository.findAllSports();
  return sports.map((sport) => ({ id: sport.id, name: sport.name }));
}
