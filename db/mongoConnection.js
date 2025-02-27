import { connect } from 'mongoose';

const developmentDbConnection = process.env.TESRTING_DB_CONNECTION_URL;
const mainDbConnectionUrl = process.env.DB_CONNECTION_URL;
const seconderyDbConnectionUrl = process.env.DB_CONNECTION_SECOND_URL;

const dbOptions = {
  minPoolSize: 20,            // Start with 20 connections for steady traffic without over-allocating resources
  maxPoolSize: 100,           // Allow up to 100 connections, reserving 50 for administrative tasks
  maxIdleTimeMS: 600000,      // Close idle connections after 10 minutes to avoid resource wastage
  serverSelectionTimeoutMS: 30000,  // Wait up to 30 seconds to find an available server before erroring out
  connectTimeoutMS: 30000,    // Allow up to 30 seconds to establish a new connection
  socketTimeoutMS: 30000,     // Timeout for socket operations to prevent long delays
  retryWrites: true,          // Enable retryable writes for resiliency
  retryReads: true,           // Enable retryable reads to improve read reliability
  waitQueueTimeoutMS: 30000,  // Wait up to 30 seconds in the connection queue if no connections are available
};

const connectToDatabase = async () => {
  try {
    // Attempt to connect to the main database
    const connectionInstance = await connect(process.env.NODE_ENV === "production" ? mainDbConnectionUrl : developmentDbConnection, dbOptions);
    console.log(`MongoDB is connected to the ${process.env.NODE_ENV === "production" ? 'main' : 'development'} DB host: ${connectionInstance.connection.host}`);
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
