import { connect } from 'mongoose';

const testDbConnection = process.env.TESRTING_DB_CONNECTION_URL;
const mainDbConnectionUrl = process.env.DB_CONNECTION_URL;
const seconderyDbConnectionUrl = process.env.DB_CONNECTION_SECOND_URL;

// Configuration options for connections
const dbOptions = {
  minPoolSize: 5,            // Maintain at least 5 connections
  maxPoolSize: 40,           // Allow up to 40 concurrent connections
  maxIdleTimeMS: 600000,      // Close idle connections after 10 minutes
  serverSelectionTimeoutMS: 15000,  // Wait up to 15 seconds for server selection
  connectTimeoutMS: 15000,  // Allow 15 seconds for connection setup
  retryWrites: true,          // Enable retryable writes
  retryReads: true,          // Enable retryable reads
  waitQueueTimeoutMS: 15000,   // Wait for 15 seconds if no connections are available
};

const connectToDatabase = async () => {
  try {
    // Attempt to connect to the main database
    const connectionInstance = await connect(mainDbConnectionUrl, dbOptions);
    console.log(`MongoDB is connected to the main DB host: ${connectionInstance.connection.host}`);
  } catch (error) {
    console.error('Error connecting to main MongoDB:', error);

    // Retry logic for secondary DB
    let retries = 0;
    const maxRetries = 2;
    const retryDelay = (retryCount) => 1000 * Math.pow(2, retryCount); // Exponential backoff

    const retryConnection = async () => {
      while (retries < maxRetries) {
        try {
          retries++;
          const secondaryConnectionInstance = await connect(seconderyDbConnectionUrl, dbOptions);
          console.log(`MongoDB is connected to the secondary DB host: ${secondaryConnectionInstance.connection.host}`);
          return;
        } catch (secondaryError) {
          console.error(`Retry ${retries}: Failed to connect to secondary DB`, secondaryError);
          if (retries < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, retryDelay(retries)));
          }
        }
      }
      console.error('Failed to connect to both main and secondary databases after retries.');
    };

    retryConnection();
  }
};

export default connectToDatabase;
