import 'dotenv/config.js';
import express, { json } from 'express';
import cors from 'cors';
import appAllRoutes from './routes/index.js';
import connectToDatabase from './db/dbConnection.js';

const app = express();

app.use(cors());

//Server PORT
const PORT = process.env.SERVER_PORT || 4000;

//Allow Cors Origin
app.use(cors({
  origin: process.env.ALLOW_ORIGIN,
  credentials: true
}));

//User Request Json Limit
app.use(json({limit: "100kb"}));
app.use(express.urlencoded({ extended: true }));

connectToDatabase()
.then(() => {
    app.listen(PORT, () => {
        console.log(`Server is running at port : ${PORT}`);
    })
  })
  .catch((err) => {
    console.log("MONGO db connection failed ! ", err);
  });


  //App All Routes In This Route
  app.use(appAllRoutes);

  