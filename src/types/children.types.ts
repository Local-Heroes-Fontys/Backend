/** Wat de repository nodig heeft om een kind op te slaan. De ouder wordt apart meegegeven. */
export interface ChildData {
  name: string | null;
  birthYear: number;
}

/** Een kind zoals het naar de client gaat. */
export interface ChildResponse {
  id: number;
  name: string | null;
  birthYear: number;
}
