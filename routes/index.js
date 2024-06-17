import express from 'express';
import adminRoute from './admin/adminRoute.js';
import homePageRoute from '../routes/homePageRoute/homePageRoute.js';
import moviesRoutes from './moviesRoutes.js';
import seriesRoutes from './seriesRoutes.js';
import actressRoute from '../routes/actressRoute/actressRoute.js';
import userRoute from '../routes/users/usersRoute.js'
import { getEmbedVideo } from '../controllers/getMovies.controller.js';

const app = express();

const mainPath = "/api/v1";

/************ ( Admin Access Route ) ****************/
app.use(`${mainPath}/admin`, adminRoute);

/*********** ( User Route ) ****************/
app.use(`${mainPath}/user`,  userRoute);

/************ ( Home Page Layout Route ) ****************/
app.use(`${mainPath}/landing_page`, homePageRoute);

/*********** ( Get Movies Info Route ) ****************/
app.use(`${mainPath}/movies`, moviesRoutes);

/*********** ( Get Actress Info Movies Ifo route ) ****************/
app.use(`${mainPath}/series`, seriesRoutes);

/*********** ( Get Actress Info Movies Ifo route ) ****************/
app.use(`${mainPath}/actress`, actressRoute);

//Paid customers for getting movies Embed Video
app.get(mainPath+'/subscriber/embed/:imdbId', getEmbedVideo);

export default app;