import { Router } from "express";
import Movies from '../models/Movies.Model.js';
import { getLatestReleaseMovie, getRecentlyAddedMovie, searchHandler } from "../controllers/getMovies.controller.js";
import { transformToCapitalize } from "../utils/index.js";
import { createQueryConditionFilter, createSortConditions, getDataBetweenDate } from "../utils/dbOperations.js";
import { genarateFilters } from "../utils/genarateFilter.js";
import { updateWatchLinks } from "./admin/controller/movies.controller.js";

const router = Router();

const selectValue = "-_id imdbId title thambnail releaseYear type";

//Route For Client Category Listing /listing/category/:query
router.post('/category/:category', async (req, res) => {

    try {

        const queryData = req.params?.category.toLowerCase().replace(/[-]/g, ' ');

        const { limit, page, skip, bodyData } = req.body;

        function filterQuery() {

            switch (queryData) {
                case 'new release':
                    return [2023, 2024];
                case 'movies':
                    return 'movie';
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
                    { type: filterQueryValue },
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
        });

        if (queryData === 'coming soon') {
            queryCondition.status = 'coming soon';
        } else {
            queryCondition.status = { $ne: 'coming soon' };
        };

        if (queryData === "new release") {
            queryCondition.fullReleaseDate = getDataBetweenDate({ type: 'months', value: 8 });
        };

        // creat sort data conditions based on user provided filter
        const sortFilterCondition = createSortConditions({
            filterData: bodyData?.filterData,
            query: queryCondition
        });

        const moviesData = await Movies.find(queryCondition)
            .skip(skip).limit(limit)
            .select(selectValue)
            .sort({ ...sortFilterCondition, _id: 1 });

        if (!moviesData.length) {
            return res.status(404).json({ message: "No movies found in this category" });
        };

        const endOfData = (moviesData.length < limit - 1);

        // creat initial response data add more responses data as needed
        const response = { moviesData, endOfData: endOfData };

        // initial filterOption need
        const filteOptionsNeeded = ['genre', 'type'];
    
        if (queryData === "new release" || queryData === "movies" && page && page === 1) {
            // check is query is movies so remove type from filter options
            if (queryData === "movies") {
                filteOptionsNeeded.pop()
            }

            filteOptionsNeeded.push('industry');
        };
        // if page is 1 then generate filter options
        if (page && page === 1) {
            response.filterOptions = await genarateFilters({
                query: queryCondition,
                filterNeed: filteOptionsNeeded
            })
        };

        return res.status(200).json(response);

    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    };
});


//Get movies by genre
router.post('/genre/:genre', async (req, res) => {

    try {

        const genre = transformToCapitalize(req.params?.genre).replace(/[-]/g, ' ');

        const { limit, page, skip, bodyData } = req.body;

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

        // creat sort data conditions based on user provided filter
        const sortFilterCondition = createSortConditions({
            filterData: bodyData?.filterData,
            query: queryCondition
        });

        const moviesData = await Movies.find(queryCondition)
            .skip(skip).limit(limit)
            .select(selectValue)
            .sort({ ...sortFilterCondition, _id: 1 });

        const endOfData = (moviesData.length < limit - 1);

        // creat initial response data add more responses data as needed
        const response = { moviesData, endOfData: endOfData };

        // initial filterOption need
        const filteOptionsNeeded = ['type', 'industry', 'provider'];

        if (page && page === 1) {
            response.filterOptions = await genarateFilters({
                query: queryCondition,
                filterNeed: filteOptionsNeeded
            });
        };

        return res.status(200).json(response);

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

        // creat query condition with filter
        const queryCondition = createQueryConditionFilter({
            query: {
                imdbRating: { $gt: 7 },
                type: 'movie',
                status: 'released'
            },
            filter: bodyData?.filterData
        });

        // creat sort data conditions based on user provided filter
        const sortFilterCondition = createSortConditions({
            filterData: bodyData?.filterData,
            query: queryCondition
        });

        const moviesData = await Movies.find(queryCondition)
            .skip(skip).limit(limit)
            .select(selectValue)
            .sort({ ...sortFilterCondition, _id: 1 });

        const endOfData = (moviesData.length < limit - 1);

        // creat initial response data add more responses data as needed
        const response = { moviesData, endOfData: endOfData };

        // initial filterOption need
        const filteOptionsNeeded = ['type', 'genre', 'industry'];

        if (page && page === 1) {
            response.filterOptions = await genarateFilters({
                query: queryCondition,
                filterNeed: filteOptionsNeeded
            });
        };

        return res.status(200).json(response);

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

        const randomSkip = Math.floor(Math.random() * (50 - 0 + 1)) + 0;

        let filterGenre = genre;

        if (genre.length > 1 && genre.includes("Drama")) {
            filterGenre = genre.filter(g => g !== "Drama")
        };

        /**const domainToFind = "https://cdn4507.loner300artoa.com";
        const pathToFind = "/stream2/i-cdn-0/";
        const newDomain = "https://cdn4521.loner300artoa.com";
        const newPath = "/stream2/i-arch-400/";
        updateWatchLinks({domainToFind, pathToFind, newDomain, newPath});**/
     
        const [genreList, castList] = await Promise.all([

            Movies.find({
                genre: { $in: filterGenre },
                category,
                imdbId: { $ne: imdbId },
                status: 'released'
            }).limit(50).skip(randomSkip).select(selectValue).sort({ imdbId: -1 }).lean().exec(),

            Movies.find({
                castDetails: { $in: castDetails },
                imdbId: { $ne: imdbId },
                status: 'released'
            }).limit(50).select(selectValue).sort({ imdbId: -1 }).lean().exec(),
        ]);

        return res.status(200).json({ movieData, suggetions: { genreList, castList } });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
});


export default router;