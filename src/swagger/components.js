/** Shared OpenAPI components (schemas, security, responses). */

export const components = {
  securitySchemes: {
    bearerAuth: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'Access token from POST /auth/login or /auth/refresh',
    },
    apiKeyAuth: {
      type: 'apiKey',
      in: 'header',
      name: 'X-Api-Key',
      description: 'N8N inbound API key (N8N_API_KEY)',
    },
  },
  parameters: {
    IdempotencyKey: {
      name: 'Idempotency-Key',
      in: 'header',
      required: false,
      schema: { type: 'string', maxLength: 128 },
      description: 'Optional replay-safe key for mutating requests',
    },
    IdempotencyKeyRequired: {
      name: 'Idempotency-Key',
      in: 'header',
      required: true,
      schema: { type: 'string', maxLength: 128 },
      description: 'Required for finding creation',
    },
    SiteproofTimestamp: {
      name: 'X-Siteproof-Timestamp',
      in: 'header',
      required: true,
      schema: { type: 'string', example: '1714000000' },
      description: 'Unix seconds; must be within WEBHOOK_REPLAY_WINDOW_SECONDS',
    },
    UuidId: {
      name: 'id',
      in: 'path',
      required: true,
      schema: { type: 'string', format: 'uuid' },
    },
    Page: {
      name: 'page',
      in: 'query',
      schema: { type: 'integer', minimum: 1, default: 1 },
    },
    Limit: {
      name: 'limit',
      in: 'query',
      schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
    },
  },
  schemas: {
    ErrorBody: {
      type: 'object',
      required: ['success', 'error'],
      properties: {
        success: { type: 'boolean', enum: [false] },
        error: {
          type: 'object',
          required: ['code', 'message'],
          properties: {
            code: { type: 'string', example: 'VALIDATION_ERROR' },
            message: { type: 'string' },
            details: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  path: { type: 'string' },
                  message: { type: 'string' },
                },
              },
            },
          },
        },
        requestId: { type: 'string' },
      },
    },
    SuccessEnvelope: {
      type: 'object',
      required: ['success', 'data'],
      properties: {
        success: { type: 'boolean', enum: [true] },
        data: {},
      },
    },
    PaginatedMeta: {
      type: 'object',
      properties: {
        items: { type: 'array', items: {} },
        page: { type: 'integer' },
        limit: { type: 'integer' },
        total: { type: 'integer' },
        pages: { type: 'integer' },
      },
    },
    AuthTokens: {
      type: 'object',
      properties: {
        accessToken: { type: 'string' },
        refreshToken: { type: 'string' },
        user: { $ref: '#/components/schemas/UserSummary' },
      },
    },
    UserSummary: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        name: { type: 'string' },
        email: { type: 'string', format: 'email' },
        role: { type: 'string', enum: ['owner', 'supervisor', 'worker'] },
        org: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
          },
        },
      },
    },
    Org: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        name: { type: 'string' },
        vertical: { type: 'string', nullable: true },
        plan: { type: 'string' },
        branding: { type: 'object', additionalProperties: true },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
    JobSummary: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        site: { type: 'string' },
        jobType: { type: 'string', nullable: true },
        status: { type: 'string', enum: ['open', 'closed'] },
        headline: { type: 'string', enum: ['open', 'pass', 'review', 'fail'], nullable: true },
        workerName: { type: 'string', nullable: true },
        counts: {
          type: 'object',
          properties: {
            pass: { type: 'integer' },
            review: { type: 'integer' },
            fail: { type: 'integer' },
          },
        },
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
    FindingAttributes: {
      type: 'object',
      properties: {
        object: { type: 'string' },
        condition: { type: 'string' },
        location: { type: 'string' },
        apparentIssue: { type: 'string' },
      },
    },
    CitedClause: {
      type: 'object',
      required: ['ref', 'text'],
      properties: {
        ref: { type: 'string', maxLength: 80 },
        text: { type: 'string', maxLength: 500 },
      },
    },
    Media: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        type: { type: 'string', enum: ['photo', 'audio'] },
        mime: { type: 'string' },
        byteSize: { type: 'integer' },
        jobId: { type: 'string', format: 'uuid', nullable: true },
        url: { type: 'string', format: 'uri' },
      },
    },
    Report: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        jobId: { type: 'string', format: 'uuid' },
        status: { type: 'string', enum: ['pending', 'generating', 'ready', 'failed'] },
        pdfStorageKey: { type: 'string', nullable: true },
        pdfUrl: { type: 'string', nullable: true },
      },
    },
    Issue: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        status: { type: 'string', enum: ['open', 'assigned', 'resolved'] },
        jobId: { type: 'string', format: 'uuid' },
        findingId: { type: 'string', format: 'uuid' },
        site: { type: 'string' },
        verdict: { type: 'string', enum: ['pass', 'review', 'fail'] },
        severity: { type: 'string', enum: ['low', 'med', 'high'] },
        reason: { type: 'string' },
        assignedTo: { type: 'string', format: 'uuid', nullable: true },
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
    Rulebook: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        title: { type: 'string' },
        vertical: { type: 'string', nullable: true },
        documents: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              filename: { type: 'string' },
              status: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
  },
  responses: {
    BadRequest: {
      description: 'Validation or bad request',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/ErrorBody' },
        },
      },
    },
    Unauthorized: {
      description: 'Missing or invalid credentials',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/ErrorBody' },
        },
      },
    },
    Forbidden: {
      description: 'Authenticated but not allowed',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/ErrorBody' },
        },
      },
    },
    NotFound: {
      description: 'Resource not found',
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/ErrorBody' },
        },
      },
    },
  },
};

/** Helper: wrap a schema as `{ success: true, data: schema }`. */
export function successData(schema) {
  return {
    type: 'object',
    required: ['success', 'data'],
    properties: {
      success: { type: 'boolean', enum: [true] },
      data: schema,
    },
  };
}

export const jsonSuccess = (schema, description = 'OK') => ({
  description,
  content: {
    'application/json': {
      schema: successData(schema),
    },
  },
});

export const bearer = [{ bearerAuth: [] }];
export const apiKey = [{ apiKeyAuth: [] }];
export const bearerOrApiKey = [{ bearerAuth: [] }, { apiKeyAuth: [] }];
