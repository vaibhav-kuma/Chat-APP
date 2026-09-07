export class HttpError extends Error {
  status: number;
  code: string;

  constructor(status: number, message: string, code = "ERROR") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const badRequest = (message = "Bad request", code = "BAD_REQUEST") =>
  new HttpError(400, message, code);

export const unauthorized = (message = "Unauthorized", code = "UNAUTHORIZED") =>
  new HttpError(401, message, code);

export const forbidden = (message = "Forbidden", code = "FORBIDDEN") =>
  new HttpError(403, message, code);

export const notFound = (message = "Not found", code = "NOT_FOUND") =>
  new HttpError(404, message, code);

export const conflict = (message = "Conflict", code = "CONFLICT") =>
  new HttpError(409, message, code);

export const tooManyRequests = (message = "Too many requests", code = "RATE_LIMITED") =>
  new HttpError(429, message, code);

export const unprocessable = (message = "Unprocessable entity", code = "UNPROCESSABLE") =>
  new HttpError(422, message, code);
