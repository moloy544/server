import mongoose from 'mongoose';

let cachedConnection = null; // Cache the connection globally

const connectToDatabase = async () => {
  // If cachedConnection exists and is already connected, reuse it
  if (cachedConnection && mongoose.connection.readyState === 1) {
    return cachedConnection;
  }

  try {
    // Connect to the database with a max pool size of 150 and max idle time of 10 minutes
    cachedConnection = await mongoose.connect(process.env.DB_CONNECTION_URL, {
      maxPoolSize: 150,         // Set maximum number of connections in the pool
      maxIdleTimeMS: 600000     // Close idle connections after 10 minutes
    });

    console.log(`MongoDB connected to host: ${cachedConnection.connection.host}`);

    return cachedConnection; // Return the cached connection
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    throw error; // Rethrow the error to handle it in the calling context
  }
};

export default connectToDatabase;
