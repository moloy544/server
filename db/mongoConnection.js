import { connect } from 'mongoose';

const developmentDbConnection = process.env.TESRTING_DB_CONNECTION_URL;
const mainDbConnectionUrl = process.env.DB_CONNECTION_URL;
const seconderyDbConnectionUrl = process.env.DB_CONNECTION_SECOND_URL;
const seconderyDbConnectionUrl2 = process.env.DB_CONNECTION_SECOND_URL2;

const dbOptions = {
  minPoolSize: 20,            // Start with 20 connections for steady traffic without over-allocating resources
  maxPoolSize: 150,           // Allow up to 150 connections to stay under the 500 connection limit
  maxIdleTimeMS: 600000,      // Close idle connections after 10 minutes to avoid resource wastage
  serverSelectionTimeoutMS: 20000,  // Wait up to 20 seconds to find an available server before erroring out
  connectTimeoutMS: 20000,    // Allow up to 20 seconds to establish a new connection
  socketTimeoutMS: 30000,     // Timeout for socket operations to prevent long delays
  retryWrites: true,          // Enable retryable writes for resiliency
  retryReads: true,           // Enable retryable reads to improve read reliability
  waitQueueTimeoutMS: 20000,  // Wait up to 20 seconds in the connection queue if no connections are available
};

const connectToDatabase = async () => {
  const retryConnection = async (url, retries, maxRetries, dbLabel) => {
    const retryDelay = (retryCount) => 1000 * Math.pow(2, retryCount); // Exponential backoff

    while (retries < maxRetries) {
      try {
        const connectionInstance = await connect(url, dbOptions);
        console.log(`MongoDB is connected to the ${dbLabel} DB host: ${connectionInstance.connection.host}`);
        return connectionInstance;
      } catch (error) {
        retries++;
        console.error(`Retry ${retries}/${maxRetries}: Failed to connect to ${dbLabel} DB. Error:`, error);
        if (retries < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay(retries)));
        }
      }
    }

    throw new Error(`Failed to connect to ${dbLabel} DB after ${maxRetries} retries.`);
  };

  try {
    // Attempt to connect to the main database
    const connectionInstance = await connect(
      process.env.NODE_ENV === "production" ? mainDbConnectionUrl : developmentDbConnection,
      dbOptions
    );
    console.log(`MongoDB is connected to the ${process.env.NODE_ENV === "production" ? 'main' : 'development'} DB host: ${connectionInstance.connection.host}`);
  } catch (mainError) {
    console.error('Error connecting to main MongoDB:', mainError);
    
    if (process.env.NODE_ENV !== "production") return; // Skip retries in development

    // Retry with secondary DB 1
    try {
      await retryConnection(seconderyDbConnectionUrl, 0, 3, 'secondary 1');
    } catch (secondaryError) {
      console.error('Error connecting to secondary MongoDB:', secondaryError);

      // Retry with secondary DB 2
      try {
        await retryConnection(seconderyDbConnectionUrl2, 0, 3, 'secondary 2');
      } catch (secondary2Error) {
        console.error('Error connecting to secondary 2 MongoDB:', secondary2Error);
      }
    }
  }
};

export default connectToDatabase;