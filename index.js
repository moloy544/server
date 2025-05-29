import 'dotenv/config.js';
import express, { json } from 'express';
import cors from 'cors';
import appAllRoutes from './routes/index.js';
import connectToDatabase from './db/mongoConnection.js';
import cookieParser from 'cookie-parser';

const app = express();

//Server PORT
const PORT = process.env.SERVER_PORT || 4000;

// Define the allowed origins as an array (you can set it from your environment variables as a comma-separated string)
const allowedOrigins = process.env.ALLOW_ORIGIN.split(',');

//Allow Cors Origin for only selected domains
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Check if the origin is in the allowedOrigins array
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);  // Allow the request
    } else {
      callback(new Error('Not allowed by CORS'));  // Reject the request
    }
  },
  credentials: true
}));

// Use cookie-parser middleware
app.use(cookieParser());

//User Request Json Limit
app.use(json({limit: "100kb"}));
app.use(express.urlencoded({ extended: true }));

connectToDatabase()
.then(() => {
     // Listen only if NOT on Vercel
     if (!process.env.VERCEL) {
      app.listen(PORT, () => {
        console.log(`Server is running at port: ${PORT}`);
      });
    }
  })
  .catch((err) => {
    console.log("MONGO db connection failed ! ", err);
  });

  //App All Routes In This Route
  app.use(appAllRoutes);

//Export the app instance for use in other files
export default app; 