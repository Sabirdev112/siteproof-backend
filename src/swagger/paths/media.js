import { bearer, jsonSuccess } from '../components.js';

export const mediaPaths = {
  '/media': {
    post: {
      tags: ['Media'],
      summary: 'Upload photo or audio',
      description:
        'Multipart: `file` + form field `type` (`photo`|`audio`). Optional `jobId`. Photo max 12 MB; audio max 15 MB.',
      security: bearer,
      parameters: [{ $ref: '#/components/parameters/IdempotencyKey' }],
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              required: ['file', 'type'],
              properties: {
                file: { type: 'string', format: 'binary' },
                type: { type: 'string', enum: ['photo', 'audio'] },
                jobId: { type: 'string', format: 'uuid' },
              },
            },
          },
        },
      },
      responses: {
        201: jsonSuccess({ $ref: '#/components/schemas/Media' }, 'Created'),
        400: { $ref: '#/components/responses/BadRequest' },
        413: { $ref: '#/components/responses/BadRequest' },
      },
    },
  },
  '/media/{id}': {
    get: {
      tags: ['Media'],
      summary: 'Get media metadata + signed URL',
      security: bearer,
      parameters: [{ $ref: '#/components/parameters/UuidId' }],
      responses: {
        200: jsonSuccess({ $ref: '#/components/schemas/Media' }),
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },
  '/media/{id}/file': {
    get: {
      tags: ['Media'],
      summary: 'Download media file',
      description:
        'Public with HMAC signed query params (`exp`, `sig`). Mounted before JWT auth.',
      security: [],
      parameters: [
        { $ref: '#/components/parameters/UuidId' },
        {
          name: 'exp',
          in: 'query',
          required: true,
          schema: { type: 'integer' },
          description: 'Unix expiry timestamp',
        },
        {
          name: 'sig',
          in: 'query',
          required: true,
          schema: { type: 'string' },
          description: 'HMAC-SHA256 signature',
        },
      ],
      responses: {
        200: {
          description: 'Binary file stream',
          content: {
            'application/octet-stream': {
              schema: { type: 'string', format: 'binary' },
            },
            'image/jpeg': {
              schema: { type: 'string', format: 'binary' },
            },
          },
        },
        401: { $ref: '#/components/responses/Unauthorized' },
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },
};

export const extractionPaths = {
  '/extract': {
    post: {
      tags: ['Extraction'],
      summary: 'Extract attributes from media',
      description: 'Transcribe audio and inspect photos. Runs via queue limiter.',
      security: bearer,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['jobId', 'mediaIds'],
              properties: {
                jobId: { type: 'string', format: 'uuid' },
                mediaIds: {
                  type: 'array',
                  minItems: 1,
                  items: { type: 'string', format: 'uuid' },
                },
                audioId: { type: 'string', format: 'uuid' },
              },
            },
          },
        },
      },
      responses: {
        200: jsonSuccess({
          type: 'object',
          properties: {
            transcript: { type: 'string' },
            attributes: { $ref: '#/components/schemas/FindingAttributes' },
          },
        }),
        400: { $ref: '#/components/responses/BadRequest' },
      },
    },
  },
};

export const compliancePaths = {
  '/compliance/check': {
    post: {
      tags: ['Compliance'],
      summary: 'Run compliance verdict',
      description: 'Retrieves SOP clauses and returns pass/review/fail recommendation.',
      security: bearer,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['jobId', 'attributes'],
              properties: {
                jobId: { type: 'string', format: 'uuid' },
                rulebookId: { type: 'string', format: 'uuid' },
                transcript: { type: 'string', maxLength: 8000 },
                attributes: { $ref: '#/components/schemas/FindingAttributes' },
              },
            },
          },
        },
      },
      responses: {
        200: jsonSuccess({
          type: 'object',
          properties: {
            verdict: { type: 'string', enum: ['pass', 'review', 'fail'] },
            severity: { type: 'string', enum: ['low', 'med', 'high'] },
            citedClause: { $ref: '#/components/schemas/CitedClause' },
            reason: { type: 'string' },
          },
          additionalProperties: true,
        }),
        422: {
          description: 'No matching SOP clauses (SOP_NOT_MATCHED)',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorBody' },
            },
          },
        },
      },
    },
  },
};
