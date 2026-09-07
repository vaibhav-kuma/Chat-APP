import type { NextFunction, Request, Response } from "express";
import { z, ZodError } from "zod";
import { HttpError } from "../utils/httpError.js";

export function validateBody(schema: z.ZodTypeAny) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        next(new HttpError(422, "Validation failed", "VALIDATION"));
      } else {
        next(err);
      }
    }
  };
}

export function validateQuery(schema: z.ZodTypeAny) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        next(new HttpError(422, "Validation failed", "VALIDATION"));
      } else {
        next(err);
      }
    }
  };
}
