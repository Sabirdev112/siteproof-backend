import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

export const apiLimiter = rateLimit({
  windowMs: 60_000,
  max: env.NODE_ENV === 'production' ? 120 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/health' || req.path === '/api/v1/health' || req.path === '/api/v1/health/ready',
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many requests, try again shortly' },
  },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60_000,
  max: env.NODE_ENV === 'production' ? 10 : 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many login attempts' },
  },
});

export const webhookLimiter = rateLimit({
  windowMs: 60_000,
  max: env.NODE_ENV === 'production' ? 60 : 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many webhook calls' },
  },
});
