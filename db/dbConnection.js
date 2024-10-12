import { connect } from 'mongoose';

const connectToDatabase = async () => {

  try {
    const connectionInstance = await connect(process.env.DB_CONNECTION_URL,{
      maxIdleTimeMS: 600000 * 3     // Close idle connections after 30 min
    });

    console.log(`MongoDB is connected to moviesbazar db host :${connectionInstance.connection.host}`);
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
  }
};

export default connectToDatabase;
