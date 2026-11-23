import * as childrenRepository from '../repositories/children.repository';
import type { ChildResponse } from '../types/children.types';
import type { ChildInput } from '../validators/children.validator';

// There is no route for this until parents can log in. `parentId` must then come from the
// logged-in parent, never from the request, or anyone could add a child to any parent.
export async function createChild(input: ChildInput, parentId: number): Promise<ChildResponse> {
  const child = await childrenRepository.createChild(parentId, input);
  return { id: child.id, name: child.name, birthYear: child.birthYear };
}
