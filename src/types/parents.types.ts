/** What the repository needs to save a new parent. */
export interface CreateParentData {
  email: string;
  passwordHash: string;
}

/** A parent as sent to the client. Never contains the password hash. */
export interface ParentResponse {
  id: number;
  email: string;
}
