import express from 'express';
import { Request, Response } from 'express';
import {
  createPrediction,
  getPredictions,
} from './services/prediction.service';
import { connectToMongoDB } from './services/db-client.service';
import 'dotenv/config';
import swaggerUi from 'swagger-ui-express';
import swaggerJSDoc from 'swagger-jsdoc';

const app = express();
const PORT = process.env.PORT || 3000;

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Spresh API',
      version: '1.0.0',
      description: 'Spresh API Documentation',
    },
    servers: [
      {
        url: process.env.ENVIRONTMENT === 'production' ? `https://api.sprash.online` : `http://localhost:${PORT}`,
        description: 'Development server',
      },
    ],
  },
  apis: ['./src/**/*.ts'], // Path to the API docs
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);

// Middleware to parse JSON requests
app.use(express.json());

// Swagger UI setup
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/**
 * @swagger
 * /predictions:
 *   get:
 *     summary: Get predictions
 *     description: Retrieve a list of predictions
 *     parameters:
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: string
 *         description: Cursor for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of records to fetch
 *     responses:
 *       200:
 *         description: List of predictions
 *       500:
 *         description: Server error
 */
app.get('/predictions', async (req: Request, res: Response) => {
  const { cursor, limit } = req.query;
  try {
    const predictions = await getPredictions(
      cursor as string,
      parseInt(limit as string, 10)
    );
    res.json(predictions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch predictions' });
  }
});

/**
 * @swagger
 * /predictions:
 *   post:
 *     summary: Create a new prediction
 *     description: Create a new prediction with the given roundId and objectId
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               roundId:
 *                 type: integer
 *                 description: The round ID for the prediction
 *               objectId:
 *                 type: string
 *                 description: The object ID for the prediction
 *     responses:
 *       200:
 *         description: The created prediction
 *       500:
 *         description: Server error
 */
app.post('/predictions', async (req: Request, res: Response) => {
  const predictionDto = req.body as { roundId: number; objectId: string };
  const newPrediction = await createPrediction(
    predictionDto.objectId,
    predictionDto.roundId
  );
  res.json(newPrediction);
});

// Start the server
app.listen(PORT, async () => {
  await connectToMongoDB();

  // test

  console.log(`Server is running on port ${PORT}`);
  console.log(
    `Swagger API documentation available at http://localhost:${PORT}/api-docs`
  );
});
