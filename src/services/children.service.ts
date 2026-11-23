import { AppError } from '../errors/AppError';
import * as childrenRepository from '../repositories/children.repository';
import * as parentsRepository from '../repositories/parents.repository';
import type { ChildResponse } from '../types/children.types';
import type { ChildInput } from '../validators/children.validator';

// De ouder komt voorlopig uit de URL. Zodra ouders kunnen inloggen, komt er een controle bij dat
// de ingelogde ouder deze ouder is, zodat niemand de kinderen van een ander gezin kan zien of
// wijzigen.

export async function createChild(input: ChildInput, parentId: number): Promise<ChildResponse> {
  await assertParentExists(parentId);
  const child = await childrenRepository.createChild(parentId, input);
  return toChildResponse(child);
}

export async function listChildren(parentId: number): Promise<ChildResponse[]> {
  await assertParentExists(parentId);
  const children = await childrenRepository.findChildren(parentId);
  return children.map(toChildResponse);
}

export async function getChild(parentId: number, id: number): Promise<ChildResponse> {
  const child = await childrenRepository.findOwnChild(parentId, id);
  if (!child) throw childNotFound();
  return toChildResponse(child);
}

export async function updateChild(
  parentId: number,
  id: number,
  input: ChildInput,
): Promise<ChildResponse> {
  const child = await childrenRepository.updateOwnChild(parentId, id, input);
  if (!child) throw childNotFound();
  return toChildResponse(child);
}

export async function deleteChild(parentId: number, id: number): Promise<void> {
  if (!(await childrenRepository.deleteOwnChild(parentId, id))) throw childNotFound();
}

async function assertParentExists(parentId: number) {
  if (!(await parentsRepository.findParentById(parentId))) {
    throw new AppError(404, 'Parent not found');
  }
}

// Ook voor een kind van een andere ouder: "het bestaat, maar is niet van jou" zou verraden dat het
// kind bestaat.
function childNotFound() {
  return new AppError(404, 'Child not found');
}

function toChildResponse(child: { id: number; name: string | null; birthYear: number }) {
  return { id: child.id, name: child.name, birthYear: child.birthYear };
}
