import { Router } from "express";
import Movies from '../models/Movies.Model.js';
import { getLatestReleaseMovie, searchHandler } from "../controllers/getMovies.controller.js";
import { getDataBetweenMonth } from "../utils/index.js";
import { countGenres } from "../lib/index.js";

const router = Router();

const selectValue = "imdbId title thambnail releaseYear type";

//Route For Client Category Listing /listing/category/:query
router.post('/category/:category', async (req, res) => {

    try {

        const queryData = req.params?.category.toLowerCase().replace(/[-]/g, ' ');

        const { limit, page, skip, bodyData } = req.body;

        const { dateSort, ratingSort, genreSort } = bodyData.filterData || {};

        function filterQuery() {

            switch (queryData) {
                case 'new release':
                    return [2023, 2024];
                default:
                    return queryData;
            };
        };

        const filterQueryValue = filterQuery();

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

        if (queryData !== 'coming soon') {
            queryCondition.status = 'released';
        };

        if (queryData === "new release") {
            queryCondition.fullReleaseDate = getDataBetweenMonth(6);
        };

        if (genreSort && genreSort !== "all") {

            queryCondition.genre = { $in: genreSort }
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

        const genre = req.params?.genre.toLowerCase().replace(/[-]/g, ' ');

        const { limit, skip, bodyData } = req.body;

        const { dateSort, ratingSort, type, language, industry, provider } = bodyData.filterData || {};

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

        const searchRegex = new RegExp(filteGenre, 'i');

        const queryCondition = {
            genre: { $in: [searchRegex] },
            status: 'released'
        };

        if (industry) {
            queryCondition.category = industry;
        };

        if (type) {
            queryCondition.type = type;
        };

        if (language) {
            queryCondition.language = language;
        };
        if (provider) {
            queryCondition.tags = { $in: provider };
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

        const endOfData = (moviesData.length < limit - 1);

        return res.status(200).json({ moviesData, endOfData: endOfData });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    };
});


//Route for client search page
router.post('/search', searchHandler);


//Latest release movies 
router.post('/latest/:query', getLatestReleaseMovie);


//Top Rated IMDb ratings movies 
router.post('/top-rated', async (req, res) => {

    try {

        const { limit, page, skip, bodyData } = req.body;

        const { dateSort, ratingSort, genreSort, industry } = bodyData.filterData || {};

        const queryCondition = {
            imdbRating: { $gt: 7 },
            type: 'movie',
            status: 'released'
        };

        if (industry) {
            queryCondition.category = industry;
        };

        if (genreSort && genreSort !== "all") {
            queryCondition.genre = { $in: genreSort }
        };

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


//Get Single Movie Datails
router.post('/details_movie/:imdbId', async (req, res) => {

    try {

        const { imdbId } = req.params;

        if (!imdbId) {
            return res.status(400).json({ message: "imdbId is required" });
        };

        const movieData = await Movies.findOne({ imdbId });

        if (!movieData) {
            return res.status(404).json({ message: "Movie not found" })
        };

        return res.status(200).json({ movieData });

    } catch (error) {
        console.log(error)
        return res.status(500).json({ message: "Internal Server Error" });
    };

});

export default router;