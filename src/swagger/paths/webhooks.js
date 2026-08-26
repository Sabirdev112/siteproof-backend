import { apiKey, jsonSuccess } from '../components.js';

export const webhooksPaths = {
  '/webhooks/n8n/report-ready': {
    post: {
      tags: ['Webhooks'],
      summary: 'Report PDF ready callback',
      description: 'n8n callback when PDF generation finishes. Requires X-Api-Key and X-Siteproof-Timestamp.',
      security: apiKey,
      parameters: [{ $ref: '#/components/parameters/SiteproofTimestamp' }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['reportId', 'status'],
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
        401: { $ref: '#/components/responses/Unauthorized' },
        400: { $ref: '#/components/responses/BadRequest' },
      },
    },
  },
  '/webhooks/n8n/actions': {
    post: {
      tags: ['Webhooks'],
      summary: 'Log automation action',
      description: 'Idempotent by job + type + target + status.',
      security: apiKey,
      parameters: [{ $ref: '#/components/parameters/SiteproofTimestamp' }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['jobId', 'type', 'status'],
              properties: {
                jobId: { type: 'string', format: 'uuid' },
                type: { type: 'string', minLength: 1, maxLength: 80 },
                target: { type: 'string', nullable: true, maxLength: 200 },
                status: { type: 'string', enum: ['ok', 'failed', 'skipped'] },
                metadata: { type: 'object', additionalProperties: true },
              },
            },
          },
        },
      },
      responses: {
        200: jsonSuccess({
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            type: { type: 'string' },
            target: { type: 'string', nullable: true },
            status: { type: 'string' },
            metadata: { type: 'object' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        }),
        201: jsonSuccess({
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            type: { type: 'string' },
            target: { type: 'string', nullable: true },
            status: { type: 'string' },
            metadata: { type: 'object' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        }, 'Created'),
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },
};
