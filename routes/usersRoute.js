import { Router } from "express";
import { Reports, Requests } from "../models/Users.Model.js";
import Movies from "../models/Movies.Model.js";
import { parseCookies } from "../utils/index.js";
import { getUserLocationDetails } from "../service/service.js";

const router = Router();
const selectValue = "-_id imdbId title thambnail releaseYear type";

// Function to generate a random alphanumeric string of a specified length
function generateRandomID(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
};

// function to setup user cookies
function setupUserCookies(res, userId) {
    const isProduction = process.env.NODE_ENV === 'production';
    // Calculate user expiration date (180 days 6 months from now)
    const cookieMaxAge = new Date();
    cookieMaxAge.setDate(cookieMaxAge.getDate() + 180);
    res.cookie('moviesbazar_user', userId, {
        path: '/',
        sameSite: isProduction ? 'none' : 'lax',
        secure: isProduction,
        httpOnly: true,
        maxAge: cookieMaxAge,
    });
};

//get watch later movies route
router.post('/watch_later', async (req, res) => {
    try {
        const { watchLater } = req.body;

        const moviesIds = watchLater.map(data => data.imdbId);

        const movies = await Movies.find({
            imdbId: { $in: moviesIds }
        }).select(selectValue).lean();

        //Map the movies and add the addAt field if IMDb ID matches
        const watchLaterData = movies.map(movie => {
            const savedMovie = watchLater.find(data => data.imdbId === movie.imdbId);
            //If a match is found, add the addAt field
            if (savedMovie) {
                return { ...movie, addAt: savedMovie.addAt };
            }
            return movie._doc;
        });

        //Short by addAt descending order
        const finalData = watchLaterData.sort((a, b) => new Date(b.addAt) - new Date(a.addAt));

        res.status(200).json(finalData);

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
            setupUserCookies(res, userId);
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

            const documentData = {
                ...reportData,
                user: userId
            };

            // get user location details 
            const userLocationDetails = await getUserLocationDetails();
            // add user location details to request document if available
            if (userLocationDetails && typeof userLocationDetails === "object") {

                const { country_name, region, city } = userLocationDetails;
                // add user location details to mongo documet
                documentData.userLocationDetails = {
                    country: country_name,
                    region,
                    city,
                }
            };
            // Create a new report
            const newReport = new Reports(documentData);

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

//User request content route
router.post('/action/request', async (req, res) => {
    try {
        const data = req.body;
        const cookies = parseCookies(req);
        let userId = cookies['moviesbazar_user'];

        // Generate new userId if not found
        if (!userId) {
            userId = generateRandomID(20);
            setupUserCookies(res, userId);
        }

        const { contentTitle, industery } = data;

        if (contentTitle === "" || industery === "") return res.status(400).json({ message: "Content title and industry are required" });

        // initialize mongo document object
        const documentData = {
            ...data,
            user: userId
        };

        // get user location details 
        const userLocationDetails = await getUserLocationDetails();
        // add user location details to request document if available
        if (userLocationDetails && typeof userLocationDetails === "object") {

            const { country_name, region, city } = userLocationDetails;
            // add user location details to mongo documet
            documentData.userLocationDetails = {
                country: country_name,
                region,
                city,
            }
        };
        // Create a new request document
        const newRequest = new Requests(documentData);

        const saveReport = await newRequest.save();

        if (saveReport) {
            return res.status(200).json({ message: 'Request submitted successfully.' });
        } else {
            return res.status(500).json({ message: 'Request submission failed.' });
        }

    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error. Please try again later." });
    }
});

// get user request contents 
router.post('/requests_data', async (req, res) => {
    try {
        const cookies = parseCookies(req);
        let userId = cookies['moviesbazar_user'];
        const { status, skip = 0, limit = 20 } = req.body;

        // Generate new userId if not found
        if (!userId) {
            userId = generateRandomID(20);
            setupUserCookies(res, userId);
            return res.status(200).json({ message: "No user found!" });
        }

        // get the user requested data with specific fields populated from the 'content' reference
        const userRequests = await Requests.find({ user: userId, reuestStatus: status || 'Resolved' })
            .limit(limit)
            .skip(skip)
            .select('-_id -userLocationDetails -user')
            .lean()
            .populate('content', selectValue);  // Select specific fields in 'content'

        if (!userRequests || userRequests.length === 0) {
            return res.status(200).json({ message: "No user requests found!" });
        };

        const endOfData = (userRequests.length < limit - 1);

        const requestsData = userRequests.filter(data => !data.content);

        const response = { endOfData };
        if (requestsData.length > 0) {
            response.requests = requestsData
        }

        const contents = userRequests.filter(data => data.content);

        if (contents.length > 0) {
            response.requestsWithData = contents;
        };
        // return the movies data along with the request data
        return res.status(200).json(response);

    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
});

export default router;