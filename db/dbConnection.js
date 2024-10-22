import { connect } from 'mongoose';

const dbConnectionUrl = process.env.DB_CONNECTION_URL;
const dbConnectionSecondUrl = process.env.DB_CONNECTION_SECOND_URL;
const testDbConnection = process.env.TESRTING_DB_CONNECTION_URL;

const connectToDatabase = async () => {
  try {
    // Try connecting to the primary database
    const connectionInstance = await connect(dbConnectionUrl, {
      minPoolSize: 5,            // Minimum of 5 connections maintained in the pool
      maxPoolSize: 30,           // Maximum of 30 concurrent connections
      maxIdleTimeMS: 600000 * 3  // Close idle connections after 30 minutes
    });
    console.log(`MongoDB is connected to the main DB host: ${connectionInstance.connection.host}`);
  } catch (error) {
    console.error('Error connecting to main MongoDB:', error);

    // Attempt to connect to the secondary database
    try {
      const secondaryConnectionInstance = await connect(dbConnectionSecondUrl, {
        minPoolSize: 5,            // Minimum of 5 connections maintained in the pool
        maxPoolSize: 30,           // Maximum of 30 concurrent connections
        maxIdleTimeMS: 600000 * 3  // Close idle connections after 30 minutes
      });
      console.log(`MongoDB is connected to the secondary DB host: ${secondaryConnectionInstance.connection.host}`);
    } catch (secondaryError) {
      console.error('Error connecting to first and secondary MongoDB:', secondaryError);
    }
  }
};

export default connectToDatabase;
