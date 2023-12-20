// config/db.js
import { connect } from 'mongoose';

const connectToDatabase = async () => {

  try {

    const connectionInstance = await connect(process.env.DB_CONNECTION_URL);
    console.log(`MongoDB is connected to Grocerit db host :${connectionInstance.connection.host}`);
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
  }
};

export default connectToDatabase;