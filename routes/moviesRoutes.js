import { Router } from "express";
import Movies from '../models/Movies.Model.js';
import { getDownloadOptionsUrls, getLatestReleaseMovie, getMovieFullDetails, getRecentlyAddedContents, searchHandler } from "../controllers/getMovies.controller.js";
import { transformToCapitalize } from "../utils/index.js";
import { createQueryConditionFilter, createSortConditions, getDataBetweenDate } from "../utils/dbOperations.js";
import { genarateFilters } from "../utils/genarateFilter.js";
import { getHlsPlaylist } from "../service/externalService.js";

const router = Router();

const selectValue = "-_id imdbId title displayTitle thumbnail releaseYear type category language videoType";

router.get('/generate-sitemap', async (req, res) => {
    try {
        const { onlyCount = false, limit = 50000 } = req.query;
        if (onlyCount === 'true') {
            const totalCount = await Movies.countDocuments();
            return res.json({ totalCount });
        } else {
            const data = await Movies.find()
                .select('-_id imdbId title type createdAt')
                .sort({ createdAt: -1 })
                .limit(parseInt(limit)).lean();

            const updatedMovies = data.map(movie => ({
                ...movie,
                createdAt: movie.createdAt || new Date(), // Use a default date if createdAt is missing
            }));

            const totalCount = data.length;
            return res.json({ movies: updatedMovies, totalCount });
        }
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
});

//Route For Client Category Listing /listing/category/:query
router.post('/category/:category', async (req, res) => {

    try {

        const queryData = req.params?.category.toLowerCase().replace(/[-]/g, ' ');

        const { limit, page, skip, bodyData } = req.body;

        function filterQuery() {
            switch (queryData) {
                case 'movies':
                    return 'movie';
                default:
                    return queryData;
            };
        };

        const filterQueryValue = filterQuery();
     
        let dbQuery = {

            $or: [
                { category: filterQueryValue },
                { type: filterQueryValue },
                { language: filterQueryValue },
                {
                    releaseYear: parseInt(filterQueryValue) || 0
                },
                { status: filterQueryValue }
            ]
        };

        if (filterQueryValue === 'new release') {
            dbQuery = {
                fullReleaseDate: getDataBetweenDate({ type: 'months', value: 8 })
            };
        };

        // creat query condition with filter
        const queryCondition = createQueryConditionFilter({
            query: dbQuery,
            filter: bodyData?.filterData
        });

        if (queryData === 'coming soon') {
            queryCondition.status = 'coming soon';
        } else {
            queryCondition.status = { $ne: 'coming soon' };
        };

        // creat sort data conditions based on user provided filter
        const sortFilterCondition = createSortConditions({
            filterData: bodyData?.filterData,
            query: queryCondition
        });
      
        const moviesData = await Movies.find(queryCondition)
            .skip(skip).limit(limit)
            .select(selectValue)
            .sort({ ...sortFilterCondition, _id: 1 }).lean();

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
            .sort({ ...sortFilterCondition, _id: 1 }).lean();

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
router.post('/recently-added', getRecentlyAddedContents);

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
            .sort({ ...sortFilterCondition, _id: 1 }).lean();

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

// GET Single Movie Full Details Route
router.get('/details_movie/:imdbId', getMovieFullDetails);

// GET Single Movie Download Options Urls
router.get('/download_urls/:imdbId', getDownloadOptionsUrls);

// GET Single Movie Hls Url Form External Service
router.get('/hls/:imdbId', getHlsPlaylist);

export default router;