import { Router } from "express";
import Movies from '../models/Movies.Model.js';
import { getLatestReleaseMovie, getRecentlyAddedContents, searchHandler } from "../controllers/getMovies.controller.js";
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
            const date = new Date();
            const currentYear = date.getFullYear();
            switch (queryData) {
                case 'new release':
                    return currentYear;
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
                        releaseYear: parseInt(filterQueryValue) || 0
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


router.get('/details_movie/:imdbId', async (req, res) => {
    try {
        const { imdbId } = req.params;
        const suggestion = req.query.suggestion === 'true';

        const imdbIdPattern = /^tt\d{7,}$/; // Improved regex for IMDb ID validation

        if (!imdbId || !imdbIdPattern.test(imdbId.trim())) {
            return res.status(400).json({ message: "IMDb ID is invalid" });
        }

        const dbQueryData = await Movies.aggregate([
            {
              $match: { imdbId }  // Find the movie by imdbId
            },
            {
              $lookup: {
                from: 'downloadlinks',  // Name of the DownloadLinks collection in MongoDB
                localField: 'imdbId',   // Field from Movies collection
                foreignField: 'content_id', // Field from DownloadLinks collection
                as: 'downloadLinks'     // Name of the resulting array field
              }
            },
            {
              $project: {
                createdAt: 0  // Exclude the createdAt field
              }
            }
          ]);
          
          if (!dbQueryData || dbQueryData.length === 0) {
            return res.status(404).json({ message: "Movie not found" });
          };

        let modifiedMovieData = JSON.parse(JSON.stringify(dbQueryData[0]));
        const { genre, castDetails, category, watchLink } = modifiedMovieData;

        const randomSkip = Math.floor(Math.random() * 50);
        let filterGenre = genre.length > 1 && genre.includes("Drama")
            ? genre.filter(g => g !== "Drama")
            : genre;

        const reorderWatchLinks = (watchLinks) => {
            const m3u8Link = watchLinks.find(link => link.includes('.m3u8'));
            if (m3u8Link) {
                watchLinks = watchLinks.filter(link => link !== m3u8Link);
                watchLinks.unshift(m3u8Link);
            }
            return watchLinks.map((link, index) => ({
                source: link,
                label: `Server ${index + 1}`,
                labelTag: link.includes('.m3u8') ? '(No Ads)' : '(Multi language)',
            }));
        };

        if (Array.isArray(watchLink) && watchLink.length > 1) {
            let filterLinks = watchLink;
            if (watchLink.some(link => link.includes('jupiter.com'))) {
                filterLinks = watchLink.filter(link => !link.includes('ooat310wind.com/stream2'));
            }
            modifiedMovieData.watchLink = reorderWatchLinks(filterLinks);
        }

        if (!suggestion) {
            return res.status(200).json({ movieData: modifiedMovieData });
        }

        const [genreList, castList] = await Promise.all([
            Movies.find({
                genre: { $in: filterGenre },
                category,
                imdbId: { $ne: imdbId },
                status: 'released'
            }).limit(25).skip(randomSkip).lean(),

            Movies.find({
                castDetails: { $in: castDetails },
                imdbId: { $ne: imdbId },
                status: 'released'
            }).limit(25).lean(),
        ]);

        return res.status(200).json({ movieData: modifiedMovieData, suggestions: { genreList, castList } });

    } catch (error) {
        console.error(error); // Use console.error for logging errors
        return res.status(500).json({ message: "Internal Server Error" });
    }
});


export default router;