import { connect } from 'mongoose';

const dbUser = encodeURIComponent(process.env.DB_CONNECTION_USERNAME);
const dbPassword = encodeURIComponent(process.env.DB_CONNECTION_PASSWORD);

const connectToDatabase = async () => {
  try {
    const connectionInstance = await connect(`mongodb+srv://${dbUser}:${dbPassword}@cluster1.hlss5.mongodb.net/moviesbazar`, {
      minPoolSize: 10,
      maxPoolSize: 250,
    });
    console.log(`MongoDB is connected to moviesbazar db host :${connectionInstance.connection.host}`);
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
  }
};

export default connectToDatabase;
