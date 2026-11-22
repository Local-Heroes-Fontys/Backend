/** The logged-in club representative, as loaded from the database for this request. */
export interface AuthenticatedRepresentative {
  id: number;
  clubId: number;
}

/** The logged-in parent, as loaded from the database for this request. */
export interface AuthenticatedParent {
  id: number;
}
