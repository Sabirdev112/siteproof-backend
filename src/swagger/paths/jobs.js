import { bearer, bearerOrApiKey, jsonSuccess } from '../components.js';

export const jobsPaths = {
  '/jobs': {
    post: {
      tags: ['Jobs'],
      summary: 'Create job',
      security: bearer,
      parameters: [{ $ref: '#/components/parameters/IdempotencyKey' }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['site'],
              properties: {
                site: { type: 'string', minLength: 1, maxLength: 500 },
                jobType: { type: 'string', maxLength: 100 },
                rulebookId: { type: 'string', format: 'uuid' },
              },
            },
          },
        },
      },
      responses: {
        201: jsonSuccess(
          {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              site: { type: 'string' },
              jobType: { type: 'string', nullable: true },
              rulebookId: { type: 'string', format: 'uuid', nullable: true },
              status: { type: 'string', example: 'open' },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
          'Created',
        ),
        400: { $ref: '#/components/responses/BadRequest' },
        403: { $ref: '#/components/responses/Forbidden' },
      },
    },
    get: {
      tags: ['Jobs'],
      summary: 'List jobs',
      description: 'Workers see own jobs; supervisors/owners see all.',
      security: bearer,
      parameters: [
        { $ref: '#/components/parameters/Page' },
        { $ref: '#/components/parameters/Limit' },
        {
          name: 'status',
          in: 'query',
          schema: { type: 'string', enum: ['open', 'closed'] },
        },
        {
          name: 'headline',
          in: 'query',
          schema: { type: 'string', enum: ['open', 'pass', 'review', 'fail'] },
        },
        { name: 'site', in: 'query', schema: { type: 'string' } },
        { name: 'workerId', in: 'query', schema: { type: 'string', format: 'uuid' } },
        { name: 'from', in: 'query', schema: { type: 'string', format: 'date-time' } },
        { name: 'to', in: 'query', schema: { type: 'string', format: 'date-time' } },
        { name: 'q', in: 'query', schema: { type: 'string' }, description: 'Search site / jobType / worker' },
      ],
      responses: {
        200: jsonSuccess({
          allOf: [
            { $ref: '#/components/schemas/PaginatedMeta' },
            {
              type: 'object',
              properties: {
                items: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/JobSummary' },
                },
              },
            },
          ],
        }),
      },
    },
  },
  '/jobs/{id}': {
    get: {
      tags: ['Jobs'],
      summary: 'Get job detail',
      description: 'Includes findings, report, and actions. Accepts Bearer or X-Api-Key.',
      security: bearerOrApiKey,
      parameters: [{ $ref: '#/components/parameters/UuidId' }],
      responses: {
        200: jsonSuccess({
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            site: { type: 'string' },
            status: { type: 'string' },
            findings: { type: 'array', items: { type: 'object', additionalProperties: true } },
            report: { $ref: '#/components/schemas/Report' },
            actions: { type: 'array', items: { type: 'object', additionalProperties: true } },
          },
        }),
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },
  '/jobs/{id}/close': {
    post: {
      tags: ['Jobs'],
      summary: 'Close job',
      description: 'Creates report, spawns issues for fail/review findings, enqueues outbox event.',
      security: bearer,
      parameters: [{ $ref: '#/components/parameters/UuidId' }],
      responses: {
        200: jsonSuccess({
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            status: { type: 'string', example: 'closed' },
            closedAt: { type: 'string', format: 'date-time' },
            report: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                status: { type: 'string' },
              },
            },
            counts: {
              type: 'object',
              properties: {
                pass: { type: 'integer' },
                review: { type: 'integer' },
                fail: { type: 'integer' },
              },
            },
          },
        }),
        404: { $ref: '#/components/responses/NotFound' },
        409: { $ref: '#/components/responses/BadRequest' },
      },
    },
  },
  '/jobs/{id}/findings': {
    post: {
      tags: ['Jobs'],
      summary: 'Add finding',
      description: 'Requires Idempotency-Key header.',
      security: bearer,
      parameters: [
        { $ref: '#/components/parameters/UuidId' },
        { $ref: '#/components/parameters/IdempotencyKeyRequired' },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['mediaIds', 'attributes', 'verdict', 'severity', 'citedClause', 'reason'],
              properties: {
                mediaIds: {
                  type: 'array',
                  minItems: 1,
                  items: { type: 'string', format: 'uuid' },
                },
                audioId: { type: 'string', format: 'uuid' },
                transcript: { type: 'string', maxLength: 8000 },
                attributes: { $ref: '#/components/schemas/FindingAttributes' },
                verdict: { type: 'string', enum: ['pass', 'review', 'fail'] },
                severity: { type: 'string', enum: ['low', 'med', 'high'] },
                citedClause: { $ref: '#/components/schemas/CitedClause' },
                reason: { type: 'string', minLength: 1, maxLength: 800 },
              },
            },
          },
        },
      },
      responses: {
        201: jsonSuccess({
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            verdict: { type: 'string' },
            severity: { type: 'string' },
            transcript: { type: 'string' },
            audioId: { type: 'string', format: 'uuid', nullable: true },
          },
        }, 'Created'),
        400: { $ref: '#/components/responses/BadRequest' },
      },
    },
  },
  '/jobs/{id}/actions': {
    get: {
      tags: ['Jobs'],
      summary: 'List job automation actions',
      security: bearerOrApiKey,
      parameters: [{ $ref: '#/components/parameters/UuidId' }],
      responses: {
        200: jsonSuccess({
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              type: { type: 'string' },
              target: { type: 'string', nullable: true },
              status: { type: 'string' },
              metadata: { type: 'object' },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
        }),
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },
};
