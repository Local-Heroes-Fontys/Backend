/** An expected error whose message is safe to send to the client, e.g. "Club not found". */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
