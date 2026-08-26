import { apiKey, bearer, bearerOrApiKey, jsonSuccess } from '../components.js';

export const reportsPaths = {
  '/reports/{id}': {
    get: {
      tags: ['Reports'],
      summary: 'Get report',
      security: bearerOrApiKey,
      parameters: [{ $ref: '#/components/parameters/UuidId' }],
      responses: {
        200: jsonSuccess({ $ref: '#/components/schemas/Report' }),
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
    patch: {
      tags: ['Reports'],
      summary: 'Update report (n8n only)',
      description: 'Requires X-Api-Key. Bearer JWT is rejected with 403.',
      security: apiKey,
      parameters: [{ $ref: '#/components/parameters/UuidId' }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['status'],
              properties: {
                reportId: { type: 'string', format: 'uuid' },
                jobId: { type: 'string', format: 'uuid' },
                status: {
                  type: 'string',
                  enum: ['pending', 'generating', 'ready', 'failed'],
                },
                pdfStorageKey: { type: 'string', nullable: true, maxLength: 500 },
                pdfUrl: { type: 'string', nullable: true, maxLength: 2000 },
                error: { type: 'string', maxLength: 500 },
              },
            },
          },
        },
      },
      responses: {
        200: jsonSuccess({ $ref: '#/components/schemas/Report' }),
        403: { $ref: '#/components/responses/Forbidden' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },
};

export const dashboardPaths = {
  '/dashboard/summary': {
    get: {
      tags: ['Dashboard'],
      summary: 'Supervisor dashboard summary',
      description: 'Requires `dashboard:read` (supervisor/owner).',
      security: bearer,
      responses: {
        200: jsonSuccess({
          type: 'object',
          properties: {
            today: { type: 'integer' },
            passed: { type: 'integer' },
            review: { type: 'integer' },
            failed: { type: 'integer' },
            recentJobs: {
              type: 'array',
              items: { $ref: '#/components/schemas/JobSummary' },
            },
          },
        }),
        403: { $ref: '#/components/responses/Forbidden' },
      },
    },
  },
};

export const issuesPaths = {
  '/issues': {
    get: {
      tags: ['Issues'],
      summary: 'List issues',
      description: 'Requires `issues:manage`.',
      security: bearer,
      parameters: [
        { $ref: '#/components/parameters/Page' },
        { $ref: '#/components/parameters/Limit' },
        {
          name: 'status',
          in: 'query',
          schema: { type: 'string', enum: ['open', 'assigned', 'resolved'] },
        },
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
                  items: { $ref: '#/components/schemas/Issue' },
                },
              },
            },
          ],
        }),
        403: { $ref: '#/components/responses/Forbidden' },
      },
    },
  },
  '/issues/{id}': {
    patch: {
      tags: ['Issues'],
      summary: 'Update issue status / assignee',
      security: bearer,
      parameters: [{ $ref: '#/components/parameters/UuidId' }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['status'],
              properties: {
                status: { type: 'string', enum: ['open', 'assigned', 'resolved'] },
                assignedTo: {
                  type: 'string',
                  format: 'uuid',
                  description: 'Required when status is assigned',
                },
              },
            },
          },
        },
      },
      responses: {
        200: jsonSuccess({ $ref: '#/components/schemas/Issue' }),
        400: { $ref: '#/components/responses/BadRequest' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },
};

export const queryPaths = {
  '/query/chat': {
    post: {
      tags: ['Query'],
      summary: 'Ask a rulebook question',
      description: 'Requires `query:chat`. Returns answer with citations.',
      security: bearer,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['rulebookId', 'message'],
              properties: {
                rulebookId: { type: 'string', format: 'uuid' },
                message: { type: 'string', minLength: 1, maxLength: 2000 },
              },
            },
          },
        },
      },
      responses: {
        200: jsonSuccess({
          type: 'object',
          properties: {
            reply: { type: 'string' },
            citations: {
              type: 'array',
              items: { $ref: '#/components/schemas/CitedClause' },
            },
          },
        }),
        400: { $ref: '#/components/responses/BadRequest' },
        403: { $ref: '#/components/responses/Forbidden' },
      },
    },
  },
};
