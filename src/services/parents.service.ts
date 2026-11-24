import { AppError } from '../errors/AppError';
import * as parentsRepository from '../repositories/parents.repository';
import type { ParentResponse } from '../types/parents.types';
import type { RegisterParentInput } from '../validators/parents.validator';
import * as passwordService from './password.service';

export async function registerParent(input: RegisterParentInput): Promise<ParentResponse> {
  if (await parentsRepository.findParentByEmail(input.email)) {
    throw new AppError(409, 'An account with this email already exists');
  }

  const parent = await parentsRepository.createParent({
    email: input.email,
    passwordHash: await passwordService.hashPassword(input.password),
  });
  // Still possible after the check above, when two requests use the same email at the same time.
  if (!parent) throw new AppError(409, 'An account with this email already exists');

  return { id: parent.id, email: parent.email };
}
