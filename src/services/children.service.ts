import * as childrenRepository from '../repositories/children.repository';
import type { AuthenticatedParent } from '../types/auth.types';
import type { ChildResponse } from '../types/children.types';
import type { ChildInput } from '../validators/children.validator';

export async function createChild(
  input: ChildInput,
  parent: AuthenticatedParent,
): Promise<ChildResponse> {
  // The parent comes from the logged-in user, never from the request body.
  const child = await childrenRepository.createChild(parent.id, input);
  return { id: child.id, name: child.name, birthYear: child.birthYear };
}
