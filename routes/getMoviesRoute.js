import { Router } from "express";
import Movies from '../models/Movies.Model.js';
import { getLatestReleaseMovie, searchHandler } from "../controllers/getMovies.controller.js";
import { latest } from "../utils/index.js";

const router = Router();

const selectValue = "imdbId title thambnail releaseYear type";

//Route For Client Category Listing /listing/category/:query
router.post('/category/:category', async (req, res) => {

    try {

        const queryData = req.params?.category.toLowerCase().replace(/[-]/g, ' ');

        const { limit, skip, bodyData } = req.body;

        const { sortFilter, categoryFilter } = bodyData.filterData

        const { dateSort, ratingSort } = sortFilter || {};

        function filterQuery() {

            switch (queryData) {
                case 'new release':
                    return [2023, 2024];
                default:
                    return queryData;
            };
        };

        const filterQueryValue = filterQuery();

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

        if (queryData !== 'coming soon') {
            queryCondition.status = 'released';
        };

        if (queryData === "new release") {
            queryCondition.fullReleaseDate = latest(6);
        };

        if (categoryFilter?.genre && categoryFilter?.genre !== "all") {

            queryCondition.genre = { $in: categoryFilter?.genre }
        };

        const sortFilterCondition = {};

        if (dateSort) {
            sortFilterCondition.releaseYear = dateSort || -1;
            sortFilterCondition.fullReleaseDate = dateSort || -1;
        } else if (ratingSort) {
            sortFilterCondition.imdbRating = ratingSort;
        };

        const moviesData = await Movies.find(queryCondition).skip(skip).limit(pageSize)
            .sort({ ...sortFilterCondition, _id: 1 })
            .select(selectValue);

        const endOfData = (moviesData.length < pageSize - 1);

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

        const { limit, skip, bodyData } = req.body;

        const { sortFilter, categoryFilter } = bodyData.filterData

        const { dateSort, ratingSort } = sortFilter || {};

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

        const pageSize = limit || 30;

        const searchRegex = new RegExp(filteGenre, 'i');

        const queryCondition = {
            genre: { $in: [searchRegex] },
            status: 'released'
        };

        if (categoryFilter?.category && categoryFilter?.category !== "all") {

            const category = categoryFilter.category.toLowerCase().replace(/[-]/g, ' ');

            if (category === "series") {

                queryCondition.type = category;

            } else if (category === "new release") {

                queryCondition.fullReleaseDate = latest(6);

            }else if (category === "hindi" || category === "hindi dubbed" || category === "bengali") {

                queryCondition.language = category;

            }else{

                queryCondition.category = category;
            };
           
        };

        const sortFilterCondition = {};

        if (dateSort) {

            sortFilterCondition.releaseYear = dateSort || -1;
            sortFilterCondition.fullReleaseDate = dateSort || -1;

        } else if (ratingSort) {
            sortFilterCondition.imdbRating = ratingSort;
        };

        const moviesData = await Movies.find(queryCondition).skip(skip).limit(pageSize)
            .sort({ ...sortFilterCondition, _id: 1 })
            .select(selectValue);

        const endOfData = (moviesData.length < pageSize - 1);

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

        const { limit, skip, bodyData } = req.body;

        const { sortFilter, categoryFilter } = bodyData.filterData

        const { dateSort, ratingSort } = sortFilter || {};

        const pageSize = limit || 30;

        const queryCondition = {
            imdbRating: { $gt: 7 },
            type: 'movie',
            status: 'released'
        };
        
        if (categoryFilter?.genre && categoryFilter?.genre !== "all") {

            queryCondition.genre = { $in: categoryFilter?.genre }
        };

        const sortFilterCondition = {};

        if (dateSort) {

            sortFilterCondition.releaseYear = dateSort || -1;
            sortFilterCondition.fullReleaseDate = dateSort || -1;

        } else if (ratingSort) {
            sortFilterCondition.imdbRating = ratingSort;
        };

        const moviesData = await Movies.find(queryCondition)
            .sort(sortFilterCondition)
            .select(selectValue)
            .skip(skip).limit(pageSize);

        const endOfData = (moviesData.length < pageSize - 1);

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

        return res.status(200).json({ movieData });

    } catch (error) {
        console.log(error)
        return res.status(500).json({ message: "Internal Server Error" });
    };

});


const updateWatchLinkUrl = async () => {
    try {

        const regexValue = new RegExp("https://friness-cherlormur-i-275.site/play/", 'i');
        const update = await Movies.updateMany(
            { watchLink: { $regex: regexValue } },

            [
                {
                    $set: {
                        watchLink: {
                            $concat: ["https://thodian-creachines-i-278.site/play/", "$imdbId"]
                        }
                    }
                }
            ]
        );

        console.log(update.modifiedCount);
    } catch (error) {
        console.error("Error updating documents:", error);
    }

}

export default router;