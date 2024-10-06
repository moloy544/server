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
        const cookies = parseCookies(req);
        let userId = cookies['moviesbazar_user'];

        // Generate new userId if not found
        if (!userId) {
            userId = generateRandomID(20);
            const isProduction = process.env.NODE_ENV === 'production';
            const cookieMaxAge = 365 * 24 * 60 * 60; // 1 year
            res.cookie('moviesbazar_user', userId, {
                path: '/',
                sameSite: isProduction ? 'none' : 'lax',
                secure: isProduction,
                httpOnly: true,
                maxAge: cookieMaxAge,
            });
        }

        const { movie, selectedReports, writtenReport } = reportData;
        
        // Find existing pending report
        let findReport = await Reports.findOne({ user: userId, movie, reportStatus: 'Pending' });

        if (findReport) {
            // Check for new report options
            const existingReports = findReport.selectedReports;
            const newReports = selectedReports.filter(report => !existingReports.includes(report));

            // If no new report options and written report is the same, return early
            if (newReports.length === 0 && findReport.writtenReport === writtenReport) {
                return res.status(400).json({ 
                    message: 'You have already submitted the selected report. Our team is reviewing the issue and will resolve it as quickly as possible. Thank you for your patience.' 
                });
            } else {
                // Add new report options and update written report if changed
                findReport.selectedReports.push(...newReports);

                if (findReport.writtenReport !== writtenReport) {
                    findReport.writtenReport = writtenReport;
                }

                // Update status and timestamp
                findReport.reportedAt = Date.now();

                await findReport.save();
                return res.status(200).json({ message: 'Report updated with new options.' });
            }
        } else {
            // Create a new report
            const newReport = new Reports({
                ...reportData,
                user: userId
            });

            const saveReport = await newReport.save();

            if (saveReport) {
                return res.status(200).json({ message: 'Report submitted successfully.' });
            } else {
                return res.status(500).json({ message: 'Report submission failed.' });
            }
        }
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error. Please try again later." });
    }
});


export default router;