import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { HttpError } from "../utils/httpError.js";

export function notFoundHandler(req: Request, res: Response, next: NextFunction): void {
  if (req.path.startsWith("/api/")) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: `Route not found: ${req.method} ${req.path}` } });
    return;
  }
  next();
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ZodError) {
    res.status(422).json({
      error: { code: "VALIDATION", message: "Validation failed", details: err.flatten() },
    });
    return;
  }

  if (err instanceof HttpError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message } });
    return;
  }

  console.error(`[error] ${req.method} ${req.path}:`, err);
  res.status(500).json({ error: { code: "INTERNAL", message: "Internal server error" } });
}
