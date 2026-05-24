import type { NextFunction, Request, Response } from 'express';
import { ZodSchema } from 'zod';
import { AppError } from '../utils/errors.js';
import { HTTP_STATUS } from '../constants/http.js';

type ValidationTarget = 'body' | 'query' | 'params';

/**
 * Zod validation middleware factory.
 * @param schema Zod schema
 * @param target Request property to validate
 */
export function validate(schema: ZodSchema, target: ValidationTarget = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      const message = result.error.issues.map((i) => i.message).join('; ');
      next(new AppError(message, HTTP_STATUS.UNPROCESSABLE, 'VALIDATION_ERROR'));
      return;
    }
    req[target] = result.data;
    next();
  };
}
