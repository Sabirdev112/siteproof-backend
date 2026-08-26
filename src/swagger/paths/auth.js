import { bearer, jsonSuccess } from '../components.js';

export const authPaths = {
  '/auth/login': {
    post: {
      tags: ['Auth'],
      summary: 'Login',
      description: 'Email/password login. Rate-limited. `client=mobile` restricts to workers; `office` excludes workers.',
      security: [],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['email', 'password'],
              properties: {
                email: { type: 'string', format: 'email' },
                password: { type: 'string', minLength: 1 },
                client: { type: 'string', enum: ['mobile', 'office'] },
              },
            },
          },
        },
      },
      responses: {
        200: jsonSuccess({ $ref: '#/components/schemas/AuthTokens' }, 'Tokens issued'),
        400: { $ref: '#/components/responses/BadRequest' },
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },
  '/auth/refresh': {
    post: {
      tags: ['Auth'],
      summary: 'Refresh tokens',
      security: [],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['refreshToken'],
              properties: {
                refreshToken: { type: 'string', minLength: 1 },
              },
            },
          },
        },
      },
      responses: {
        200: jsonSuccess({ $ref: '#/components/schemas/AuthTokens' }),
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },
  '/auth/logout': {
    post: {
      tags: ['Auth'],
      summary: 'Logout (revoke refresh token)',
      security: [],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: ['refreshToken'],
              properties: {
                refreshToken: { type: 'string', minLength: 1 },
              },
            },
          },
        },
      },
      responses: {
        200: jsonSuccess({
          type: 'object',
          properties: { loggedOut: { type: 'boolean', example: true } },
        }),
      },
    },
  },
  '/me': {
    get: {
      tags: ['Auth'],
      summary: 'Current user',
      security: bearer,
      responses: {
        200: jsonSuccess({ $ref: '#/components/schemas/UserSummary' }),
        401: { $ref: '#/components/responses/Unauthorized' },
      },
    },
  },
};
