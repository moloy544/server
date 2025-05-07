import express from 'express';
import adminRoute from './admin/adminRoute.js';
import dmcaAdminRoute from './dmcaAdmin/dmcaAdmin.Route.js';
import homePageRoute from './homePage.Route.js';
import moviesRoutes from './movies.Routes.js';
import seriesRoutes from './series.Routes.js';
import listingContentRoutes from './listingsContent.Route.js';
import actressRoute from './actors.Route.js';
import userRoute from './users.Route.js';
import mobileAppRoute from './applicationRoutes/mobileApp.route.js';
import { getEmbedVideo } from '../controllers/getMovies.controller.js';

const app = express();

const mainPath = "/api/v1";

/************ ( Admin Access Route ) ****************/
app.use(`${mainPath}/admin`, adminRoute);

/************ ( DMCA Admin Access Route ) ****************/
app.use(`${mainPath}/dmca-admin`, dmcaAdminRoute);

/*********** ( User Route ) ****************/
app.use(`${mainPath}/user`,  userRoute);

/************ ( Home Page Layout Route ) ****************/
app.use(`${mainPath}/landing_page`, homePageRoute);

/*********** ( All Movies Related Routes ) ****************/
app.use(`${mainPath}/movies`, moviesRoutes);

/*********** ( All Series Related Route ) ****************/
app.use(`${mainPath}/series`, seriesRoutes);

/*********** ( All Listing Content Related Routes Like [Top Trending, Featured Content] ) ****************/
app.use(`${mainPath}/listing`, listingContentRoutes);

/*********** ( Get Actress Info Movies Ifo route ) ****************/
app.use(`${mainPath}/actress`, actressRoute);


//Paid customers for getting movies Embed Video
app.post(mainPath+'/subscriber/embed', getEmbedVideo);

/************** Only Mobile Application Related Route **********************/
app.use(`${mainPath}/mobile_application`, mobileAppRoute);

export default app;