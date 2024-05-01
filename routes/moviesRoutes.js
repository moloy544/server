import { Router } from "express";
import Movies from '../models/Movies.Model.js';
import { getLatestReleaseMovie, getRecentlyAddedMovie, searchHandler } from "../controllers/getMovies.controller.js";
import { createQueryConditionFilter, getDataBetweenDate, transformToCapitalize } from "../utils/index.js";
import { countGenres } from "../lib/index.js";

const router = Router();

const selectValue = "-_id imdbId title thambnail releaseYear type";

//Route For Client Category Listing /listing/category/:query
router.post('/category/:category', async (req, res) => {

    try {

        const queryData = req.params?.category.toLowerCase().replace(/[-]/g, ' ');

        const { limit, page, skip, bodyData } = req.body;

        const { dateSort, ratingSort } = bodyData?.filterData || {};

        function filterQuery() {

            switch (queryData) {
                case 'new release':
                    return [2023, 2024];
                default:
                    return queryData;
            };
        };

        const filterQueryValue = filterQuery();

        // creat query condition with filter
        const queryCondition = createQueryConditionFilter({
            query: {
                $or: [
                    { category: filterQueryValue },
                    { language: filterQueryValue },
                    {
                        releaseYear: {
                            $in: Array.isArray(filterQueryValue) ? filterQueryValue : [parseInt(filterQueryValue) || 0]
                        }
                    },
                    { status: filterQueryValue }
                ]
            },
            filter: bodyData?.filterData
        },
        );

        if (queryData !== 'coming soon') {
            queryCondition.status = 'released';
        };

        if (queryData === "new release") {
            queryCondition.fullReleaseDate = getDataBetweenDate({ type: 'months', value: 6 });
        };

        const sortFilterCondition = {};

        if (ratingSort) {
            sortFilterCondition.imdbRating = ratingSort;
        };

        if (dateSort) {
            sortFilterCondition.releaseYear = dateSort || -1;
            sortFilterCondition.fullReleaseDate = dateSort || -1;
        };

        const moviesData = await Movies.find(queryCondition)
            .skip(skip).limit(limit)
            .select(selectValue)
            .sort({ ...sortFilterCondition, _id: 1 });

        if (!moviesData.length) {
            return res.status(404).json({ message: "No movies found in this category" });
        }

        let dataToSend = {};

        const endOfData = (moviesData.length < limit - 1);

        dataToSend = { moviesData, endOfData: endOfData };

        if (page && page === 1) {

            const genreCount = await countGenres({ query: queryCondition });

            dataToSend.filterCount = genreCount;
        };

        return res.status(200).json(dataToSend);

    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    };
});


//Get movies by genre
router.post('/genre/:genre', async (req, res) => {

    try {

        const genre = transformToCapitalize(req.params?.genre).replace(/[-]/g, ' ');

        const { limit, skip, bodyData } = req.body;

        const { dateSort, ratingSort } = bodyData.filterData || {};

        function filterQuery() {

            switch (genre) {

                case 'Sci Fi':
                    return 'Sci-Fi';
                case 'Reality Tv':
                    return 'Reality-Tv'
                default:
                    return genre;
            };
        };

        const filteGenre = filterQuery();

        // creat query condition with filter
        const queryCondition = createQueryConditionFilter({
            query: {
                genre: { $in: filteGenre },
                status: 'released'
            },
            filter: bodyData?.filterData
        });

        const sortFilterCondition = {};

        if (ratingSort) {
            sortFilterCondition.imdbRating = ratingSort;
        };

        if (dateSort) {

            sortFilterCondition.releaseYear = dateSort || -1;
            sortFilterCondition.fullReleaseDate = dateSort || -1;
        };

        const moviesData = await Movies.find(queryCondition)
            .skip(skip).limit(limit)
            .select(selectValue)
            .sort({ ...sortFilterCondition, _id: 1 });

        const endOfData = (moviesData.length < limit - 1);

        return res.status(200).json({ moviesData, endOfData: endOfData });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    };
});


//Route for client search page
router.post('/search', searchHandler);

//get recently added movies or series
//Top Rated IMDb ratings movies 
router.post('/recently-added', getRecentlyAddedMovie);

//Latest release movies 
router.post('/latest/:query', getLatestReleaseMovie);

//Top Rated IMDb ratings movies 
router.post('/top-rated', async (req, res) => {

    try {

        const { limit, page, skip, bodyData } = req.body;

        const { dateSort, ratingSort } = bodyData?.filterData || {};

         // creat query condition with filter
         const queryCondition = createQueryConditionFilter({
            query: {
                imdbRating: { $gt: 7 },
                type: 'movie',
                status: 'released'
            },
            filter: bodyData?.filterData
         });

        const sortFilterCondition = {};

        if (dateSort) {
            sortFilterCondition.releaseYear = dateSort || -1;
            sortFilterCondition.fullReleaseDate = dateSort || -1;
        };

        if (ratingSort) {
            sortFilterCondition.imdbRating = ratingSort;
        };

        const moviesData = await Movies.find(queryCondition)
            .skip(skip).limit(limit)
            .select(selectValue)
            .sort({ ...sortFilterCondition, _id: 1 });

        let dataToSend = {};

        const endOfData = (moviesData.length < limit - 1);

        dataToSend = { moviesData, endOfData: endOfData };

        if (page && page === 1) {

            const genreCount = await countGenres({ query: queryCondition });

            dataToSend.filterCount = genreCount;
        };

        return res.status(200).json(dataToSend);

    } catch (error) {
        console.log(error)
        return res.status(500).json({ message: "Internal Server Error" });
    };

});


//get single movie or series details with suggestions data
router.get('/details_movie/:imdbId', async (req, res) => {
    try {
        const { imdbId } = req.params;

        if (!imdbId) {
            return res.status(400).json({ message: "imdbId is required" });
        }

        const movieData = await Movies.findOne({ imdbId });

        if (!movieData) {
            return res.status(404).json({ message: "Movie not found" });
        }

        const { genre, castDetails, category } = movieData || {};

        const randomSkip = Math.floor(Math.random() * (100 - 0 + 1)) + 0;

        const [genreList, castList] = await Promise.all([

            Movies.find({
                genre: { $in: genre },
                category,
                imdbId: { $ne: imdbId },
                status: 'released'
            }).limit(30).skip(randomSkip).select(selectValue).sort({ imdbId: -1 }).lean().exec(),

            Movies.find({
                castDetails: { $in: castDetails },
                imdbId: { $ne: imdbId },
                status: 'released'
            }).limit(30).select(selectValue).sort({ imdbId: -1 }).lean().exec(),
        ]);

        return res.status(200).json({ movieData, suggetions: { genreList, castList } });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
});


export default router;