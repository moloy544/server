import { connect } from 'mongoose';

const developmentDbConnection = process.env.TESRTING_DB_CONNECTION_URL;
const mainDbConnectionUrl = process.env.DB_CONNECTION_URL;
const seconderyDbConnectionUrl = process.env.DB_CONNECTION_SECOND_URL;
const seconderyDbConnectionUrl2 = process.env.DB_CONNECTION_SECOND_URL2;

// Configuration options for connections
const dbOptions = {
  minPoolSize: 5,
  maxPoolSize: 100,
  maxIdleTimeMS: 600000,
  serverSelectionTimeoutMS: 15000,
  connectTimeoutMS: 15000,
  retryWrites: true,
  retryReads: true,
  waitQueueTimeoutMS: 15000,
};

const connectToDatabase = async () => {
  try {
    // Attempt to connect to the main database
    const connectionInstance = await connect(
      process.env.NODE_ENV !== 'development' ? mainDbConnectionUrl : developmentDbConnection,
      dbOptions
    );
    console.log(`MongoDB is connected to the main DB host: ${connectionInstance.connection.host}`);
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
