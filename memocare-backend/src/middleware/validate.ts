import { NextFunction, Request, Response } from 'express';
import { ZodTypeAny, ZodError } from 'zod';
import { AppError } from '../utils/errors';

type ValidationTarget = 'body' | 'query' | 'params';

/**
 * Validates and replaces req[target] with the parsed (and type-coerced)
 * result of the given Zod schema. On failure, forwards a 400
 * VALIDATION_ERROR with field-level details.
 */
export function validate(schema: ZodTypeAny, target: ValidationTarget = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req[target]);
      (req as any)[target] = parsed;
      return next();
    } catch (err) {
      if (err instanceof ZodError) {
        return next(
          AppError.badRequest(
            'Request validation failed',
            err.issues.map((i) => ({ path: i.path.join('.'), message: i.message }))
          )
        );
      }
      return next(err);
    }
  };
}
