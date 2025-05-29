import mongoose, { connect } from 'mongoose';

const dbOptions = {
  minPoolSize: 5,              // Keep a small base of open connections
  maxPoolSize: 50,             // Safer limit to avoid exhausting cluster connections
  maxIdleTimeMS: 180000,       // Close idle connections after 3 minutes to free resources
  serverSelectionTimeoutMS: 10000,  // Fail fast if no suitable server found (10s)
  connectTimeoutMS: 10000,          // Faster connect timeout (10s)
  retryWrites: true,           // Enable automatic retry on transient write errors
  retryReads: true,            // Enable automatic retry on transient read errors
  waitQueueTimeoutMS: 10000,   // Timeout for waiting to acquire a connection from pool (10s)
};

const mainDbConnectionUrl = process.env.DB_CONNECTION_URL;
const devDbConnectionUrl = process.env.TESRTING_DB_CONNECTION_URL;
const secondaryUrls = [
  { url: process.env.DB_CONNECTION_SECOND_URL, label: 'secondary1' },
  { url: process.env.DB_CONNECTION_SECOND_URL2, label: 'secondary2' },
];

const connectToDatabase = async () => {
  const isDevelopment = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
  const primaryUrl = isDevelopment ? devDbConnectionUrl : mainDbConnectionUrl;

  if (mongoose.connection.readyState >= 1) {
    return;
  }

  try {
    await connect(primaryUrl, dbOptions);
    console.log(`MongoDB connected to ${isDevelopment ? 'development' : 'main'} DB`);
  } catch (error) {
    console.error('Primary connection failed:', error);
    let retries = 0;
    const retryDelay = (n) => 1000 * Math.pow(2, n);

    for (const db of secondaryUrls) {
      try {
        await mongoose.disconnect();
        await new Promise((resolve) => setTimeout(resolve, retryDelay(retries)));
        await connect(db.url, dbOptions);
        console.log(`MongoDB connected to ${db.label} DB`);
        return;
      } catch (err) {
        retries++;
        console.error(`Retry ${retries}: Failed to connect to ${db.label}`, err);
      }
    }

    console.error('All DB connection attempts failed.');
  }
};

export default connectToDatabase;
