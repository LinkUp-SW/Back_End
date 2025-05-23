// Purpose: To connect to the MongoDB database and start the server
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL || '';
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || '';

export const connectToDatabase = async () => {
  try {
    await mongoose.connect(DATABASE_URL);
    console.log('Connected to MongoDB');
  } catch (err) {
    console.error('Error connecting to MongoDB:', (err as Error).message);
    throw err;
  }
};

export const connectToTestDatabase = async () => {
  try {
    await mongoose.connect(TEST_DATABASE_URL);
    console.log('Connected to test MongoDB');
  } catch (err) {
    console.error('Error connecting to MongoDB:', (err as Error).message);
    throw err;
  }
}

export const disconnectFromDatabase = async () => {
  await mongoose.disconnect();
  console.log('Disconnected from MongoDB');
};