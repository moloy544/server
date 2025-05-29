import 'dotenv/config.js';
import express, { json } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import appAllRoutes from './routes/index.js';
import connectToDatabase from './db/mongoConnection.js';

const app = express();

const PORT = process.env.SERVER_PORT || 4000;
const allowedOrigins = process.env.ALLOW_ORIGIN.split(',');

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use(cookieParser());
app.use(json({limit: "100kb"}));
app.use(express.urlencoded({ extended: true }));

// Connect to DB before starting the server and using routes
connectToDatabase()
.then(() => {
    
    // Now that DB is connected, use your routes (models in routes should get connection via ConnectionManager.getConnection())
    app.use(appAllRoutes);

    if (!process.env.VERCEL) {
      app.listen(PORT, () => {
        console.log(`Server is running at port: ${PORT}`);
      });
    }
})
.catch((err) => {
    console.error('MongoDB connection failed!', err);
});

export default app;
