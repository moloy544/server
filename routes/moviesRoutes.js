import { Router } from "express";
import Movies from '../models/Movies.Model.js';
import { getLatestReleaseMovie, getRecentlyAddedMovie, searchHandler } from "../controllers/getMovies.controller.js";
import { transformToCapitalize } from "../utils/index.js";
import { createQueryConditionFilter, createSortConditions, getDataBetweenDate } from "../utils/dbOperations.js";
import { genarateFilters } from "../utils/genarateFilter.js";

const router = Router();

const selectValue = "-_id imdbId title thambnail releaseYear type";

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
                .limit(parseInt(limit))

            const updatedMovies = data.map(movie => ({
                ...movie.toObject(),
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


router.get('/details_movie/:imdbId', async (req, res) => {
    try {
        const { imdbId } = req.params;
        const suggestion = req.query.suggestion === 'true';

        // Validate imdbId
        if (!imdbId || imdbId.trim().length <= 6) {
            return res.status(400).json({ message: "Invalid IMDb ID" });
        }

        const movieData = await Movies.findOne({ imdbId }).lean();

        // Handle case where movie is not found
        if (!movieData) {
            return res.status(404).json({ message: "Movie not found" });
        }

        // Clone movieData to avoid direct mutation issues
        const modifiedMovieData = JSON.parse(JSON.stringify(movieData));

        const { genre, castDetails, category, watchLink } = modifiedMovieData;

        // Prepare genre for filtering suggestions
        const filterGenre = genre.filter(g => g !== "Drama" || genre.length <= 1);

        // Function to reorder watch links
        const reorderWatchLinks = (watchLinks) => {
            const m3u8LinkIndex = watchLinks.findIndex(link => link.includes('.m3u8'));
            if (m3u8LinkIndex > -1) {
                const [m3u8Link] = watchLinks.splice(m3u8LinkIndex, 1);
                watchLinks.unshift(m3u8Link);
            }

            return watchLinks.map((link, index) => ({
                source: link,
                label: `Server ${index + 1}`,
                labelTag: link.includes('.m3u8') ? '(No Ads)' : '(Multi Language)'
            }));
        };

        // Check and reorder watch links if necessary
        if (Array.isArray(watchLink) && watchLink.length > 0) {
            const filterLinks = watchLink.filter(link => !link.includes('ooat310wind.com/stream2'));
            modifiedMovieData.watchLink = reorderWatchLinks(filterLinks);
        }

        // Return movie data if suggestions are not requested
        if (!suggestion) {
            return res.status(200).json({ movieData: modifiedMovieData });
        }

        // Fetch suggestions only when suggestion is true
        const [genreList, castList] = await Promise.all([
            Movies.find({
                genre: { $in: filterGenre },
                category,
                imdbId: { $ne: imdbId },
                status: 'released'
            }).limit(50).lean(),

            Movies.find({
                castDetails: { $in: castDetails },
                imdbId: { $ne: imdbId },
                status: 'released'
            }).limit(50).lean(),
        ]);

        return res.status(200).json({
            movieData: modifiedMovieData,
            suggestions: { genreList, castList }
        });

    } catch (error) {
        console.error('Error fetching movie details:', error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
});


export default router;