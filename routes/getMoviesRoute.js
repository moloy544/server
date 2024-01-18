import { Router } from "express";
import Movies from '../models/Movies.Model.js';
import axios from "axios";

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

        const filteQuery = filterQuery();

        const { limit, skip } = req.body;

        const pageSize = limit || 30;

        const queryCondition = {
            $or: [
                { category: filteQuery },
                { language: filteQuery },
                {
                    releaseYear: {
                        $in: Array.isArray(filteQuery) ? filteQuery : [parseInt(filteQuery) || 0]
                    }
                }
            ],
            type: 'movie'
        };

        if (sortFilterQuery === 'latest' || queryData ==="new release") {

            const currentDate = new Date();
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(currentDate.getMonth() - 6);

            queryCondition.fullReleaseDate = { $gte: sixMonthsAgo, $lte: currentDate }
        };

        const moviesData = await Movies.find(queryCondition).skip(skip).limit(pageSize)
            .sort({ releaseYear: -1, fullReleaseDate: -1, _id: 1 })
            .select(selectValue);

        if (moviesData.length === 0) {
            return res.status(404).send({ message: "Movies not found" });
        };

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
        }).skip(skip)
            .limit(pageSize)
            .sort({ releaseYear: -1, fullReleaseDate: -1, _id: 1 })
            .select(selectValue);

        const endOfData = searchData.length < pageSize ? true : false;

        return res.status(200).json({ searchData, endOfData: endOfData });

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

        const moviesData = await Movies.find({ imdbRating: { $gt: 7 }, type: 'movie' })
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
router.post('/details_movie', async (req, res) => {

    try {

        const imdbId = req.body.movie;

        const movieData = await Movies.findOne({ imdbId: 'tt' + imdbId });

        if (!movieData) {
            return res.status(404).json({ message: "Movie not found" })
        };

        //await updateMovieByOmdbApi(movieData)

        return res.status(200).json({ movieData });

    } catch (error) {
        console.log(error)
        return res.status(500).json({ message: "Internal Server Error" });
    };

});


const updateMovieByOmdbApi = async (movieData) => {
    try {

        if (!movieData) {
            return null;
        }

        const movieImdbId = movieData?.imdbId;

        const movoeImdbRating = movieData?.imdbRating;

        if (!movoeImdbRating) {

            const omdbResponse = await axios.get(`https://www.omdbapi.com/?&apikey=f5c514a9&plot=full&i=${movieImdbId}`);

            if (omdbResponse.status === 200) {

                const { imdbRating } = omdbResponse.data || {};

                if (imdbRating && imdbRating !== "N/A" && imdbRating !== "") {

                    const updateMovie = await Movies.findOneAndUpdate(
                        { imdbId: movieImdbId },
                        {
                            $set: {
                                imdbRating
                            }
                        },
                        { new: true })
                    console.log("Movis is update with imbd rating: " + updateMovie.imdbRating);
                } else {

                    await Movies.findOneAndUpdate(
                        { imdbId: movieImdbId },
                        {
                            $set: {
                                imdbRating: 0
                            }
                        },
                        { new: true })
                    console.log("Movie update with imdbId: " + 0);
                };
            }
        } else {
            console.log("Movie Imdbrating is exist")
        }
    } catch (error) {
        console.log(error);
    }
};


export default router;