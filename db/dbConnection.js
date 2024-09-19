import { connect } from 'mongoose';

let isConnected = false;

const connectToDatabase = async () => {
  if (isConnected) {
    return;
  }

  try {
    const connectionInstance = await connect(process.env.DB_CONNECTION_URL);
    isConnected = true;
    console.log(`MongoDB connected to host: ${connectionInstance.connection.host}`);
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
  }
};

export default connectToDatabase;
