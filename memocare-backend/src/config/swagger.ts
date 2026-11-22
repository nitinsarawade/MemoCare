import swaggerJsdoc from 'swagger-jsdoc';

export const openapiSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'MemoCare API',
      version: '1.0.0',
      description:
        'Backend API for MemoCare — a dementia/Alzheimer\'s early-detection and monitoring platform ' +
        'combining speech analysis, cognitive screening, video sessions, and caregiver collaboration.',
    },
    servers: [{ url: '/api/v1' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' },
                details: { type: 'object', nullable: true },
              },
            },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: 'Auth' },
      { name: 'Admin' },
      { name: 'Patients' },
      { name: 'Media' },
      { name: 'Screening' },
      { name: 'Progress' },
      { name: 'Reports' },
      { name: 'Tutorials' },
      { name: 'Notifications' },
      { name: 'Appointments' },
      { name: 'Medications' },
      { name: 'Location' },
      { name: 'Mind Games' },
      { name: 'Medical Stores' },
    ],
  },
  apis: ['./src/routes/*.ts', './dist/src/routes/*.js'],
});
