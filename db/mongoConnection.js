import { connect } from 'mongoose';

const developmentDbConnection = process.env.TESRTING_DB_CONNECTION_URL;
const mainDbConnectionUrl = process.env.DB_CONNECTION_URL;
const seconderyDbConnectionUrl = process.env.DB_CONNECTION_SECOND_URL;
const seconderyDbConnectionUrl2 = process.env.DB_CONNECTION_SECOND_URL2;

const dbOptions = {
  minPoolSize: 20,
  maxPoolSize: 200,
  maxIdleTimeMS: 300000,
  serverSelectionTimeoutMS: 12000,
  connectTimeoutMS: 12000,
  socketTimeoutMS: 20000,
  waitQueueTimeoutMS: 7000,
  retryWrites: true,
  retryReads: true,
  heartbeatFrequencyMS: 10000,
  appName: "MoviesBazarApp"
};

const isConnectionAlive = async (connection) => {
  try {
    await connection.connection.db.admin().ping();
    return true;
  } catch {
    return false;
  }
};

const retryConnection = async (url, retries, maxRetries, dbLabel) => {
  const retryDelay = (retryCount) => 1000 * Math.pow(2, retryCount);

  while (retries < maxRetries) {
    try {
      const connectionInstance = await connect(url, dbOptions);
      const alive = await isConnectionAlive(connectionInstance);

      if (!alive) throw new Error('Ping failed after connect');

      console.log(`✅ MongoDB connected to ${dbLabel}`);
      return connectionInstance;
    } catch (error) {
      retries++;
      console.error(`🔁 Retry ${retries}/${maxRetries} - Failed to connect to ${dbLabel}. Error:`, error.message);
      if (retries < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay(retries)));
      }
    }
  }

  throw new Error(`❌ Failed to connect to ${dbLabel} after ${maxRetries} retries.`);
};

const connectToDatabase = async () => {
  const env = process.env.NODE_ENV;
  const primaryUrl = env === "production" ? mainDbConnectionUrl : developmentDbConnection;

  try {
    const mainConnection = await retryConnection(primaryUrl, 0, 3, env === "production" ? 'main' : 'development');
    console.log('✅ Connected to main DB');
    return mainConnection;
  } catch (mainError) {
    console.error(`❌ Main DB connection failed:`, mainError.message);

    try {
      const secondary1 = await retryConnection(seconderyDbConnectionUrl, 0, 3, 'secondary 1');
      console.log('✅ Connected to secondary 1 DB');
      return secondary1;
    } catch (secondary1Error) {
      console.error('❌ Error connecting to secondary 1 MongoDB:', secondary1Error.message);

      try {
        const secondary2 = await retryConnection(seconderyDbConnectionUrl2, 0, 3, 'secondary 2');
        console.log('✅ Connected to secondary 2 DB');
        return secondary2;
      } catch (secondary2Error) {
        console.error('❌ Error connecting to secondary 2 MongoDB:', secondary2Error.message);
        throw new Error("❌ All DB connection attempts failed.");
      }
    }
  }
};

export default connectToDatabase;
