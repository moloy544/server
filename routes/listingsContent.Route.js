import { Router } from "express";
import { TopTrendingContenListing } from "../controllers/listingContents.controller.js";

const router = Router();

// ******************* All Listings Content Routes **************8 //

// Get top trending content listing
router.post('/trending', TopTrendingContenListing);

export default router;