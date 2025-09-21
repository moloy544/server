import { connect } from 'mongoose';

const developmentDbConnection = process.env.TESRTING_DB_CONNECTION_URL;
const mainDbConnectionUrl = process.env.DB_CONNECTION_URL;
const seconderyDbConnectionUrl = process.env.DB_CONNECTION_SECOND_URL;
const seconderyDbConnectionUrl2 = process.env.DB_CONNECTION_SECOND_URL2;

const dbOptions = {
  minPoolSize: 10,              // Keep a small base of open connections
  maxPoolSize: 70,             // Safer limit to avoid exhausting cluster connections
  maxIdleTimeMS: 180000,       // Close idle connections after 3 minutes to free resources
  serverSelectionTimeoutMS: 15000,  // Fail fast if no suitable server found (15s)
  connectTimeoutMS: 15000,          // Faster connect timeout (15s)
  retryWrites: true,           // Enable automatic retry on transient write errors
  retryReads: true,            // Enable automatic retry on transient read errors
  waitQueueTimeoutMS: 15000,   // Timeout for waiting to acquire a connection from pool (15s)
};


const connectToDatabase = async () => {
  try {
    const isDevelopment = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
    // Attempt to connect to the main database
    const connectionInstance = await connect(
      !isDevelopment ? mainDbConnectionUrl : developmentDbConnection,
      dbOptions
    );
    console.log(`MongoDB is connected to the ${isDevelopment ? "development" : "main"} DB host: ${connectionInstance.connection.host}`);
  } catch (error) {
    console.error('Error connecting to main MongoDB:', error);

    // Retry logic for secondary DBs
    let retries = 0;
    const retryDelay = (retryCount) => 1000 * Math.pow(2, retryCount); // Exponential backoff

    const attemptSecondaryConnection = async (url, label) => {
      try {
        const conn = await connect(url, dbOptions);
        console.log(`MongoDB is connected to the ${label} DB host: ${conn.connection.host}`);
        return true;
      } catch (err) {
        console.error(`Retry ${retries + 1}: Failed to connect to ${label} DB`, err);
        await new Promise(resolve => setTimeout(resolve, retryDelay(retries)));
        return false;
      }
    };

    const secondaryUrls = [
      { url: seconderyDbConnectionUrl, label: 'secondary' },
      { url: seconderyDbConnectionUrl2, label: 'secondary2' },
    ];

    for (const db of secondaryUrls) {
      retries++;
      const success = await attemptSecondaryConnection(db.url, db.label);
      if (success) return;
    }

    console.error('Failed to connect to main and all secondary databases.');
  }
};

export default connectToDatabase;
