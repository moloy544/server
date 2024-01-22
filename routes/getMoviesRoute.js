import { Router } from "express";
import Movies from '../models/Movies.Model.js';
import axios from "axios";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const router = Router();

const selectValue = "imdbId title thambnail releaseYear type";

//Route For Client Category Listing /listing/category/:query
router.post('/category/:category', async (req, res) => {

    try {

        const queryData = req.params?.category.toLowerCase().replace(/[-]/g, ' ');

        const sortFilterQuery = req.query?.sort;

        function filterQuery() {

            switch (queryData) {
                case 'new release':
                    return [2023, 2024];
                default:
                    return queryData;
            };
        };

        const filterQueryValue = filterQuery();

        const { limit, skip } = req.body;

        const pageSize = limit || 30;

        const queryCondition = {
            $or: [
                { category: filterQueryValue },
                { language: filterQueryValue },
                {
                    releaseYear: {
                        $in: Array.isArray(filterQueryValue) ? filterQueryValue : [parseInt(filterQueryValue) || 0]
                    }
                },
                { status: filterQueryValue }
            ],

            type: 'movie',
        };

        if (filterQueryValue !== 'coming soon') {
            queryCondition.status = 'released';
        }

        const moviesData = await Movies.find(queryCondition).skip(skip).limit(pageSize)
            .sort({ releaseYear: -1, fullReleaseDate: -1, _id: 1 })
            .select(selectValue);

        const endOfData = moviesData.length < pageSize ? true : false;

        return res.status(200).json({ moviesData, endOfData: endOfData });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    };
});


//Get movies by genre
router.post('/genre/:genre', async (req, res) => {

    try {

        const genre = req.params?.genre.toLowerCase().replace(/[-]/g, ' ');

        const inCategory = req.query?.sort;

        function filterQuery() {

            switch (genre) {

                case 'sci fi':
                    return 'Sci-Fi';
                case 'reality tv':
                    return 'Reality-Tv'
                default:
                    return genre;
            };
        };

        const filteGenre = filterQuery();

        const { limit, skip } = req.body;

        const pageSize = limit || 30;

        const searchRegex = new RegExp(filteGenre, 'i');

        const queryCondition = {
            genre: { $in: [searchRegex] },
            status: 'released'
        };

        if (inCategory) {
            queryCondition.category = inCategory
        };

        const moviesData = await Movies.find(queryCondition).skip(skip).limit(pageSize)
            .sort({ releaseYear: -1, fullReleaseDate: -1, _id: 1 })
            .select(selectValue);

        const endOfData = moviesData.length < pageSize ? true : false;

        return res.status(200).json({ moviesData, endOfData: endOfData });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    };
});


//Route for client search page
router.post('/search', async (req, res) => {

    try {

        const { q } = req.query;

        const { limit, skip } = req.body;

        const pageSize = limit || 25;

        const searchRegex = new RegExp(q, 'i');

        const searchData = await Movies.find({
            $or: [
                { title: { $regex: searchRegex } },
                { category: { $regex: searchRegex } },
                { type: { $regex: searchRegex } },
                { language: { $regex: searchRegex } },
                { genre: { $in: [searchRegex] } },
                { castDetails: { $in: [searchRegex] } },
                { searchKeywords: { $regex: searchRegex } },
                { releaseYear: parseInt(q) || 0 },
            ],
        }).skip(skip).limit(pageSize)
            .sort({ releaseYear: -1, fullReleaseDate: -1, _id: 1 })
            .select(selectValue);

        const endOfData = searchData.length < pageSize ? true : false;

        return res.status(200).json({ moviesData: searchData, endOfData: endOfData });

    } catch (error) {
        console.log(error)
        return res.status(500).json({ message: "Internal Server Error" });
    };

});


//Latest release movies 
router.post('/latest/:query', async (req, res) => {

    try {

        const querySlug = req.params.query?.toLocaleLowerCase().replace('-', ' ')

        const { limit, skip } = req.body;

        const pageSize = limit || 30;

        const currentDate = new Date();
        const fromDate = new Date();
        fromDate.setMonth(currentDate.getMonth() - 8);

        const queryCondition = {
            $or: [
                { category: querySlug },
                { language: querySlug },
                { status: querySlug }
            ],
            fullReleaseDate : { 
                $gte: fromDate, 
                $lte: currentDate 
            },
            type: 'movie',
            status: 'released'
        };

        const moviesData = await Movies.find(queryCondition).skip(skip).limit(pageSize)
            .sort({ releaseYear: -1, fullReleaseDate: -1, _id: 1 })
            .select(selectValue);

        const endOfData = moviesData.length < pageSize ? true : false;

        return res.status(200).json({ moviesData, endOfData: endOfData });

    } catch (error) {
        console.log(error)
        return res.status(500).json({ message: "Internal Server Error" });
    };

});


//Top Rated IMDb ratings movies 
router.post('/top-rated', async (req, res) => {

    try {

        const { limit, skip } = req.body;

        const pageSize = limit || 30;

        const moviesData = await Movies.find({
            imdbRating: { $gt: 7 },
            type: 'movie',
            status: 'released'
        })
            .sort({ imdbRating: -1, _id: 1 })
            .select(selectValue)
            .skip(skip).limit(pageSize);

        const endOfData = moviesData.length < pageSize ? true : false;

        return res.status(200).json({ moviesData, endOfData: endOfData });

    } catch (error) {
        console.log(error)
        return res.status(500).json({ message: "Internal Server Error" });
    };

});


//Get Singke Movie Datails
router.post('/details_movie/:imdbId', async (req, res) => {

    try {

        const { imdbId } = req.params;

        if (!imdbId) {
            return res.status(400).json({ message: "imdbId is required" });
        }

        const movieData = await Movies.findOne({ imdbId });

        if (!movieData) {
            return res.status(404).json({ message: "Movie not found" })
        };

        //await updateMovieByOmdbApi(movieData);

        //await updateMovieImage(movieData);

        //await updateWatchLink('tt' + imdbId)

        return res.status(200).json({ movieData });

    } catch (error) {
        console.log(error)
        return res.status(500).json({ message: "Internal Server Error" });
    };

});

const updateWatchLink = async (imdbId) => {
    await Movies.findOneAndUpdate(
        { imdbId },
        {
            $set: {
                watchLink: `https://gregarpor-roundens-i-276.site//play/${imdbId}`
            }
        }
    )
}


const updateMovieImage = async (movieData) => {

    if (movieData.length < 1) {
        console.log("Movie data is empty");
        return
    };

    const { thambnail, _id } = movieData;

    const uploadCloudinary = await uploadOnCloudinary({
        image: thambnail,
        imageId: _id,
        folderPath: "moviesbazaar/thambnails"
    });

    if (!uploadCloudinary) {
        console.log("Error while upload on cloudinary")
    };

    const newThambnail = uploadCloudinary.secure_url || thambnail;

    const newMovieData = {
        thambnail: newThambnail
    };

    const updateMovie = await Movies.findOneAndUpdate(

        { _id },

        newMovieData,

        { new: true }
    );
    console.log("Movie has been update with new thambnail: ", updateMovie.thambnail)
};



const updateMovieByOmdbApi = async (movieData) => {
    try {

        if (!movieData) {
            return null;
        }

        const movieImdbId = movieData?.imdbId;

        const omdbResponse = await axios.get(`https://www.omdbapi.com/?&apikey=f5c514a9&plot=full&i=${movieImdbId}`);

        if (omdbResponse.status === 200) {

            const { Year, Released } = omdbResponse.data || {};

            const originalDate = Released ? new Date(Released) : null;

            // Format the date without the time portion
            const formattedDate = originalDate?.toISOString().split('T')[0];

            const updateMovie = await Movies.findOneAndUpdate(
                { imdbId: movieImdbId },

                {
                    $set: {
                        fullReleaseDate: formattedDate,
                        releaseYear: Year,
                    }
                },
                { new: true })
            console.log("Movis is update with year and relese date: " + updateMovie.releaseYear + " " + updateMovie.fullReleaseDate);
        }

    } catch (error) {
        console.log(error);
    }
};


export default router;