import { connect } from 'mongoose';

const connectToDatabase = async () => {
  try {
    const connectionInstance = await connect(process.env.DB_CONNECTION_URL, {
      minPoolSize: 5,            // Minimum of 5 connections maintained in the pool
      maxPoolSize: 40,           // Maximum of 40 concurrent connections
      maxIdleTimeMS: 600000 * 3  // Close idle connections after 30 minutes
    });

    console.log(`MongoDB is connected to moviesbazar db host: ${connectionInstance.connection.host}`);
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
  }
};

export default connectToDatabase;
