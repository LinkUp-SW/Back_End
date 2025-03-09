// swaggerOptions.ts
import { Options } from 'swagger-jsdoc';

const options: Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Linkup API Docs',
      version: '1.0.0',
      description: 'API Documentation for the Linkup project',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
    ],
  },
  // Path to the API docs
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'], // Adjust this path according to your project structure
};

export default options;
