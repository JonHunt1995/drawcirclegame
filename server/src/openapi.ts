export const openApiDoc = {
  openapi: '3.1.0',
  info: {
    title: 'CircleDraw API',
    version: '1.0.0',
    description:
      'API and routes for the CircleDraw precision drawing game, providing stroke evaluation, stats aggregation, and score cards.',
  },
  servers: [
    {
      url: 'https://circledraw.jonhunt.dev',
      description: 'Production',
    },
    {
      url: 'http://localhost:8788',
      description: 'Local development',
    },
  ],
  paths: {
    '/api/v1/game': {
      post: {
        summary: 'Submit circle drawing',
        description:
          'Evaluates drawn points using algebraic circle fitting (Kåsa method), applies geometric variance penalties, and records the score.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: {
                    type: 'string',
                    maxLength: 32,
                    description:
                      'Player display name (truncated to 32 characters, defaults to Anonymous)',
                    example: 'CircleMaster',
                  },
                  points: {
                    type: 'array',
                    minItems: 20,
                    description: 'Sequential coordinate points of the drawn stroke',
                    items: {
                      type: 'object',
                      properties: {
                        x: { type: 'number', description: 'X coordinate in pixels' },
                        y: { type: 'number', description: 'Y coordinate in pixels' },
                      },
                      required: ['x', 'y'],
                    },
                  },
                  screenWidth: {
                    type: 'number',
                    description: 'Screen viewport width in pixels used for device categorization',
                    example: 390,
                  },
                  isTouch: {
                    type: 'boolean',
                    description: 'Whether touch input was detected',
                    example: true,
                  },
                },
                required: ['points'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Drawing successfully evaluated and saved',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    gameid: {
                      type: 'string',
                      format: 'uuid',
                      description: 'Unique game identifier',
                    },
                    name: { type: 'string', description: 'Stored player name' },
                    score: { type: 'number', description: 'Accuracy score percentage (0-100)' },
                    reference: {
                      type: 'object',
                      properties: {
                        cx: { type: 'number', description: 'Fitted circle center X' },
                        cy: { type: 'number', description: 'Fitted circle center Y' },
                        r: { type: 'number', description: 'Fitted circle radius' },
                      },
                      required: ['cx', 'cy', 'r'],
                    },
                    direction: {
                      type: 'string',
                      enum: ['clockwise', 'counterclockwise'],
                      description: 'Stroke drawing direction',
                    },
                    device: {
                      type: 'string',
                      enum: ['mobile', 'tablet', 'desktop'],
                      description: 'Categorized player device',
                    },
                  },
                  required: ['gameid', 'name', 'score', 'reference', 'direction', 'device'],
                },
              },
            },
          },
          '400': {
            description: 'Malformed input or points do not form a recognizable circle',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                  },
                  required: ['message'],
                },
              },
            },
          },
          '403': {
            description: 'Forbidden due to CSRF origin mismatch',
          },
        },
      },
    },
    '/game/{id}': {
      get: {
        summary: 'View game score card',
        description:
          'Server-side rendered score card with SVG stroke replay, percentile calculation, and Open Graph tags.',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Game UUID',
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          '200': {
            description: 'HTML score card page',
            content: { 'text/html': {} },
          },
          '404': {
            description: 'Game ID not found',
          },
        },
      },
    },
    '/leaderboard/{timeframe}': {
      get: {
        summary: 'View leaderboard',
        description: 'Server-side rendered top 25 leaderboard filtered by timeframe.',
        parameters: [
          {
            name: 'timeframe',
            in: 'path',
            required: false,
            description: 'Time window for leaderboard ranking',
            schema: {
              type: 'string',
              enum: ['all', 'daily', 'weekly', 'monthly'],
              default: 'all',
            },
          },
        ],
        responses: {
          '200': {
            description: 'HTML leaderboard page',
            content: { 'text/html': {} },
          },
        },
      },
    },
  },
} as const;
