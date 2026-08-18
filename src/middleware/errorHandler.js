import { ZodError } from 'zod';
import { AppError } from '../lib/AppError.js';
import { logger } from '../lib/logger.js';
import { isProd } from '../config/env.js';

export function errorHandler(err, req, res, _next) {
  const requestId = req.id;

  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_JSON', message: 'Malformed JSON body' },
      requestId,
    });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request',
        details: err.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      },
      requestId,
    });
  }

  if (err instanceof AppError) {
    if (err.status >= 500 && err.status !== 501) {
      logger.error({ err, requestId }, err.message);
    }
    return res.status(err.status).json({
      success: false,
      error: { code: err.code, message: err.message, details: err.details },
      requestId,
    });
  }

  logger.error({ err, requestId }, 'unhandled error');
  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: isProd ? 'Something went wrong' : err.message,
    },
    requestId,
  });
}

export function notFound(req, res) {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: `No route ${req.method} ${req.path}` },
    requestId: req.id,
  });
}
