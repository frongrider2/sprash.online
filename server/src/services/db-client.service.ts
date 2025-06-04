import mongoose from 'mongoose';
import 'dotenv/config';

const MONGODB_URI = `mongodb://${process.env.MONGO_INITDB_USERNAME}:${process.env.MONGO_INITDB_PASSWORD}@${process.env.MONGO_HOST}:27017/${process.env.MONGO_INITDB_DATABASE}`;
let MongoDB: mongoose.Connection;

console.log;

export const connectToMongoDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    throw error;
  }
};

export { MongoDB };
