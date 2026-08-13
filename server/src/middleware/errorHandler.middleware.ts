import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

export class ApiError extends Error {
  status: number;
  code: string;
  field?: string;
  constructor(status: number, code: string, message: string, field?: string) {
    super(message);
    this.status = status;
    this.code = code;
    this.field = field;
  }
}

export const notFound = (entity: string) => new ApiError(404, "NOT_FOUND", `${entity} not found`);
export const forbidden = (message = "You do not have permission to perform this action") =>
  new ApiError(403, "FORBIDDEN", message);
export const unauthenticated = (message = "Authentication required") =>
  new ApiError(401, "UNAUTHENTICATED", message);
export const conflict = (message: string) => new ApiError(409, "CONFLICT", message);

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message, field: err.field } });
  }
  if (err instanceof ZodError) {
    const first = err.issues[0];
    return res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: first?.message || "Invalid input", field: first?.path.join(".") },
    });
  }
  // SQLite unique constraint violations surface here
  if (err instanceof Error && /UNIQUE constraint failed/.test(err.message)) {
    return res.status(409).json({ error: { code: "CONFLICT", message: "A record with this identifier already exists" } });
  }
  console.error(err);
  return res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong" } });
}

export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) {
  return (req: Request, res: Response, next: NextFunction) => fn(req, res, next).catch(next);
}
