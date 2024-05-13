import { Router } from "express";
import Reports from "../../models/Reports.Model.js";
import Movies from "../../models/Movies.Model.js";

const router = Router();

const selectValue = "-_id imdbId title thambnail releaseYear type";

//get watch later movies route
router.post('/watch_later', async (req, res) => {
    try {

        const { limit, skip, bodyData } = req.body;

        const { saveData } = bodyData;

        const moviesIds = saveData?.map(data => data.imdbId);

        const movies = await Movies.find({
            imdbId: { $in: moviesIds }
        }).sort({ createdAt: -1 }).limit(limit).skip(skip).select(selectValue);

        // Map over the movies and add the 'addAt' field if IMDb ID matches
        const watchLaterData = movies?.map(movie => {
            const savedMovie = saveData.find(data => data.imdbId === movie.imdbId);
            // If a match is found, add the 'addAt' field
            if (savedMovie) {
                return { ...movie._doc, addAt: savedMovie.addAt };
            }
            return movie._doc;
        });

        const endOfData = (watchLaterData.length < limit - 1);

        res.json({ moviesData: watchLaterData, endOfData: endOfData });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
});

//Report movies route
router.post('/action/report', async (req, res) => {
    try {

        const { reportData } = req.body;

        const newReport = new Reports(reportData);

        const saveReport = await newReport.save();

        if (saveReport) {

            return res.status(200).json({ message: 'Report successfull', saveReport });

        } else {

            return res.status(500).json({ message: 'Report is not success' });
        };

    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
});

export default router;