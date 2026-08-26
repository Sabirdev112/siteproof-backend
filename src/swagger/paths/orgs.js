import { bearer, jsonSuccess } from '../components.js';

export const orgsPaths = {
  '/orgs/me': {
    get: {
      tags: ['Organizations'],
      summary: 'Get current organization',
      security: bearer,
      responses: {
        200: jsonSuccess({ $ref: '#/components/schemas/Org' }),
        401: { $ref: '#/components/responses/Unauthorized' },
        403: { $ref: '#/components/responses/Forbidden' },
      },
    },
    patch: {
      tags: ['Organizations'],
      summary: 'Update current organization',
      description: 'Requires `org:write` (owner).',
      security: bearer,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              minProperties: 1,
              properties: {
                name: { type: 'string', minLength: 1, maxLength: 200 },
                vertical: { type: 'string', nullable: true, maxLength: 100 },
                branding: { type: 'object', additionalProperties: true },
              },
            },
          },
        },
      },
      responses: {
        200: jsonSuccess({ $ref: '#/components/schemas/Org' }),
        400: { $ref: '#/components/responses/BadRequest' },
        403: { $ref: '#/components/responses/Forbidden' },
      },
    },
  },
  '/orgs/{id}/invite': {
    post: {
      tags: ['Organizations'],
      summary: 'Invite team member',
      description: 'Not implemented — returns 501.',
      security: bearer,
      parameters: [{ $ref: '#/components/parameters/UuidId' }],
      responses: {
        501: {
          description: 'Not implemented',
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

export const settingsPaths = {
  '/settings': {
    get: {
      tags: ['Settings'],
      summary: 'Get org settings',
      security: bearer,
      responses: {
        200: jsonSuccess({ type: 'object', additionalProperties: true }),
        403: { $ref: '#/components/responses/Forbidden' },
      },
    },
    patch: {
      tags: ['Settings'],
      summary: 'Merge-patch org settings',
      description: 'Requires `settings:write` (owner).',
      security: bearer,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              minProperties: 1,
              additionalProperties: true,
            },
          },
        },
      },
      responses: {
        200: jsonSuccess({ type: 'object', additionalProperties: true }),
        400: { $ref: '#/components/responses/BadRequest' },
        403: { $ref: '#/components/responses/Forbidden' },
      },
    },
  },
};
