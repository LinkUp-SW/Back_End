import express, { Request, Response } from 'express';
import { connectToDatabase } from './config/database';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req: Request, res: Response) => {
  res.send('Hello fro World!');
});

app.post('/api/products', async (req: Request, res: Response) => {
  try {
    res.status(201).json({ message: 'Product created' });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
});

connectToDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log('Server is running on port:', PORT);
    });
  })
  .catch(err => {
    console.error('Failed to start server:', err);
  });
