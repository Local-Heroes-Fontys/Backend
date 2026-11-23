/** What the repository needs to save a child. The parent is passed separately. */
export interface ChildData {
  name: string | null;
  birthYear: number;
}

/** A child as sent to the client. */
export interface ChildResponse {
  id: number;
  name: string | null;
  birthYear: number;
}
