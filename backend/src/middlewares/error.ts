import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'ValidationError', issues: err.flatten() });
  }
  const status = err?.statusCode ?? 500;
  const code = err?.code ?? (status === 404 ? 'NotFound' : 'InternalServerError');
  const message = status === 500 ? 'Internal Server Error' : err?.message ?? 'Error';
  return res.status(status).json({ error: code, message });
}
