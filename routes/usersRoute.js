import { Router } from "express";
import Reports from "../models/Reports.Model.js";
import Movies from "../models/Movies.Model.js";
import { parseCookies } from "../utils/index.js";
import crypto from "crypto"

// Function to generate a random alphanumeric string of a specified length
function generateRandomID(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}


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
        let userId = cookies['moviesbazar_user'];
        if (!userId) {
            // Generate a 20-digit random user ID
            userId = generateRandomID(20);

            // Check if the environment is production
            const isProduction = process.env.NODE_ENV === 'production';

            // Define cookie expiration for 1 year
            const cookieMaxAge = 365 * 24 * 60 * 60; // 1 year in seconds

            // Set the 'user' cookie with the random ID
            res.cookie('moviesbazar_user', userId, {
                path: '/', // The cookie is available throughout the site
                sameSite: isProduction ? 'none' : 'lax', // Cookie security
                secure: isProduction, // Secure cookie in production
                httpOnly: true, // Prevent client-side JS from accessing the cookie
                maxAge: cookieMaxAge, // Set max age to 1 year
            });
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