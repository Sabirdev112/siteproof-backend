import { bearer, jsonSuccess } from '../components.js';

export const rulebooksPaths = {
  '/rulebooks': {
    get: {
      tags: ['Rulebooks'],
      summary: 'List rulebooks',
      security: bearer,
      responses: {
        200: jsonSuccess({
          type: 'array',
          items: { $ref: '#/components/schemas/Rulebook' },
        }),
      },
    },
    post: {
      tags: ['Rulebooks'],
      summary: 'Create rulebook',
      description: 'Requires `rulebooks:write`.',
      security: bearer,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['title'],
              properties: {
                title: { type: 'string', minLength: 1, maxLength: 200 },
                vertical: { type: 'string', maxLength: 50 },
              },
            },
          },
        },
      },
      responses: {
        201: jsonSuccess({ $ref: '#/components/schemas/Rulebook' }, 'Created'),
        400: { $ref: '#/components/responses/BadRequest' },
        403: { $ref: '#/components/responses/Forbidden' },
      },
    },
  },
  '/rulebooks/{id}': {
    get: {
      tags: ['Rulebooks'],
      summary: 'Get rulebook',
      security: bearer,
      parameters: [{ $ref: '#/components/parameters/UuidId' }],
      responses: {
        200: jsonSuccess({ $ref: '#/components/schemas/Rulebook' }),
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },
  '/rulebooks/{id}/status': {
    get: {
      tags: ['Rulebooks'],
      summary: 'Ingestion / indexing status',
      security: bearer,
      parameters: [{ $ref: '#/components/parameters/UuidId' }],
      responses: {
        200: jsonSuccess({
          type: 'object',
          properties: {
            documents: { type: 'integer' },
            chunks: { type: 'integer' },
            status: { type: 'string' },
          },
          additionalProperties: true,
        }),
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },
  '/rulebooks/{id}/search': {
    get: {
      tags: ['Rulebooks'],
      summary: 'Search rulebook chunks',
      security: bearer,
      parameters: [
        { $ref: '#/components/parameters/UuidId' },
        {
          name: 'q',
          in: 'query',
          required: true,
          schema: { type: 'string', minLength: 1, maxLength: 300 },
        },
        {
          name: 'limit',
          in: 'query',
          schema: { type: 'integer', minimum: 1, maximum: 50 },
        },
      ],
      responses: {
        200: jsonSuccess({
          type: 'array',
          items: {
            type: 'object',
            properties: {
              ref: { type: 'string' },
              text: { type: 'string' },
              score: { type: 'number' },
            },
          },
        }),
        400: { $ref: '#/components/responses/BadRequest' },
      },
    },
  },
  '/rulebooks/{id}/documents': {
    post: {
      tags: ['Rulebooks'],
      summary: 'Upload PDF document',
      description: 'Multipart field `file`. Max 25 MB. MIME `application/pdf`.',
      security: bearer,
      parameters: [{ $ref: '#/components/parameters/UuidId' }],
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              required: ['file'],
              properties: {
                file: { type: 'string', format: 'binary' },
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
            filename: { type: 'string' },
            status: { type: 'string' },
          },
          additionalProperties: true,
        }, 'Created'),
        400: { $ref: '#/components/responses/BadRequest' },
        413: { $ref: '#/components/responses/BadRequest' },
      },
    },
  },
  '/rulebooks/{id}/documents/{documentId}': {
    delete: {
      tags: ['Rulebooks'],
      summary: 'Delete document',
      security: bearer,
      parameters: [
        { $ref: '#/components/parameters/UuidId' },
        {
          name: 'documentId',
          in: 'path',
          required: true,
          schema: { type: 'string', format: 'uuid' },
        },
      ],
      responses: {
        200: jsonSuccess({
          type: 'object',
          properties: { deleted: { type: 'boolean' } },
          additionalProperties: true,
        }),
        404: { $ref: '#/components/responses/NotFound' },
      },
    },
  },
};
