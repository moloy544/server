import 'dotenv/config.js';
import express, { json } from 'express';
import cors from 'cors';
import appAllRoutes from './routes/index.js';
import connectToDatabase from './db/dbConnection.js';
import cookieParser from 'cookie-parser';

const app = express();

//Server PORT
const PORT = process.env.SERVER_PORT || 4000;

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
  app.get('/ip', (req, res) => {
    // Get user IP address from the 'x-forwarded-for' header
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    res.json({
      message: 'Welcome to the Express API!',
      ip: `Your IP address is: ${ip}`,
      timestamp: new Date().toISOString()
    });
  });

//Export the app instance for use in other files
export default app; 