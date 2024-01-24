import express from 'express';
import adminRoute from './admin/adminRoute.js';
import homePageRoute from '../routes/homePageRoute/homePageRoute.js';
import getMoviesRoute from '../routes/getMoviesRoute.js';
import getSeriesRoute from '../routes/getSeriesRoute.js';
import actressRoute from '../routes/actressRoute/actressRoute.js';
import userRoute from '../routes/users/usersRoute.js'

const app = express();

const mainPath = "/api/v1";

/************ ( Admin Access Route ) ****************/
app.use(`${mainPath}/admin`, adminRoute);

/*********** ( User Route ) ****************/
app.use(`${mainPath}/user`,  userRoute);

/************ ( Home Page Layout Route ) ****************/
app.use(`${mainPath}/landing_page`, homePageRoute);

/*********** ( Get Movies Info Route ) ****************/
app.use(`${mainPath}/movies`, getMoviesRoute);

/*********** ( Get Actress Info Movies Ifo route ) ****************/
app.use(`${mainPath}/series`, getSeriesRoute);

/*********** ( Get Actress Info Movies Ifo route ) ****************/
app.use(`${mainPath}/actress`, actressRoute);


export default app;