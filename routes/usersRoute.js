import { Router } from "express";
import Reports from "../models/Reports.Model.js";
import Movies from "../models/Movies.Model.js";
import { parseCookies } from "../utils/index.js";

const router = Router();

const selectValue = "-_id imdbId title thambnail releaseYear type";

//get watch later movies route
router.post('/watch_later', async (req, res) => {
    try {
        const { watchLater } = req.body;

        const moviesIds = watchLater.map(data => data.imdbId);

        const movies = await Movies.find({
            imdbId: { $in: moviesIds }
        }).select(selectValue);

        //Map the movies and add the addAt field if IMDb ID matches
        const watchLaterData = movies.map(movie => {
            const savedMovie = watchLater.find(data => data.imdbId === movie.imdbId);
            //If a match is found, add the addAt field
            if (savedMovie) {
                return { ...movie._doc, addAt: savedMovie.addAt };
            }
            return movie._doc;
        });

        //Short by addAt descending order
        const finalData = watchLaterData.sort((a, b) => new Date(b.addAt) - new Date(a.addAt))

        res.json(finalData);

    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
});

//Report movies route
router.post('/action/report', async (req, res) => {
    try {

        const { reportData } = req.body;

        //Get the user id from cookies
        const cookies = parseCookies(req);

        //Check if user is have userid or not
        const userId = cookies['moviesbazar_user'];
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized action not allowed' });
        };

        //Create a new report object with user id and report data
        const newReport = new Reports({ ...reportData, user: userId });
           
        const saveReport = await newReport.save();

        if (saveReport) {

            return res.status(200).json({ message: 'Report successfull' });

        } else {

            return res.status(500).json({ message: 'Report is not success' });
        };

    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error Please Try Again Later" });
    }
});

export default router;