// Purpose: To connect to the MongoDB database and start the server
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL || '';

export const connectToDatabase = async () => {
  try {
    await mongoose.connect(DATABASE_URL);
    console.log('Connected to MongoDB');
  } catch (err) {
    console.error('Error connecting to MongoDB:', (err as Error).message);
    throw err;
  }
};