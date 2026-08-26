import { jsonSuccess } from '../components.js';

export const healthPaths = {
  '/health': {
    get: {
      tags: ['Health'],
      summary: 'Liveness check',
      security: [],
      responses: {
        200: jsonSuccess(
          {
            type: 'object',
            properties: {
              status: { type: 'string', example: 'ok' },
              service: { type: 'string', example: 'siteproof-api' },
              phase: { type: 'string' },
            },
          },
          'Service is alive',
        ),
      },
    },
  },
  '/health/ready': {
    get: {
      tags: ['Health'],
      summary: 'Readiness probe',
      description: 'DB ping, storage driver, queue stats, pool metrics',
      security: [],
      responses: {
        200: jsonSuccess(
          {
            type: 'object',
            properties: {
              status: { type: 'string' },
              db: { type: 'string' },
              pgvector: { type: 'string' },
              storage: { type: 'string' },
              cloudinary: { type: 'string' },
              queue: { type: 'object', additionalProperties: true },
              pool: { type: 'object', additionalProperties: true },
            },
          },
          'Ready',
        ),
        503: { $ref: '#/components/responses/BadRequest' },
      },
    },
  },
};
