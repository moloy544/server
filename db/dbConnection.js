import { connect } from 'mongoose';

const connectToDatabase = async () => {

  try {
    const connectionInstance = await connect(process.env.DB_CONNECTION_URL);

    /** const connectionInstance = await connect(process.env.DB_CONNECTION_URL, {
      maxPoolSize: 300,
      maxIdleTimeMS: 600000 * 6     // Close idle connections after 1 hours
    }); **/
    console.log(`MongoDB is connected to moviesbazar db host :${connectionInstance.connection.host}`);
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
  }
};

export default connectToDatabase;
