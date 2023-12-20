import express from 'express';
import moviesControllerRoute from '../routes/admin/moviesControllerRoute.js';
import homePageRoute from '../routes/homePageRoute/homePageRoute.js';
import getMoviesRoute from '../routes/getMoviesRoute.js';

const app = express();

const mainPath = "/api/v1";

/************ ( Admin Access Route ) ****************/
app.use(`${mainPath}/admin`, moviesControllerRoute);

/************ ( Home Page Layout Route ) ****************/
app.use(`${mainPath}/landing_page`, homePageRoute);

/*********** ( Get Movies Info Route ) ****************/
app.use(`${mainPath}/movies`, getMoviesRoute);

export default app;