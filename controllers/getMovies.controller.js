import { genarateFilters } from "../utils/genarateFilter.js";
import Movies from "../models/Movies.Model.js";
import { createQueryConditionFilter, createSortConditions, getDataBetweenDate } from "../utils/dbOperations.js";

const selectFields = "-_id imdbId title dispayTitle thambnail releaseYear type category language videoType";

// Function to escape special regex characters in the query string
function escapeRegexSpecialChars(str) {
    return str?.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Escape all special characters
};

//************* Movies Search Handler Function Controller *************//
export async function searchHandler(req, res) {
    try {
        const { q } = req.query;
        const { limit = 30, skip = 0 } = req.body;

        if (!q) {
            return res.status(400).json({ message: "Invalid search query" });
        }

        // Clean query and escape special regex characters
        const cleanedQuery = q.trim().toLowerCase();
        const escapedQuery = escapeRegexSpecialChars(cleanedQuery); // Escape special characters

        // Split query into individual words for fuzzy search
        const splitQuery = cleanedQuery.split(' ');

        // Regular expression for "starts with" the full query (case-insensitive)
        const startsWithQueryRegex = new RegExp(`^${escapedQuery}`, 'i');

        // Regular expression for full query (case-insensitive)
        const fullQueryRegex = new RegExp(escapedQuery, 'i');

        // Fuzzy search regex (match each term in the query string)
        const fuzzyQueryRegex = new RegExp(splitQuery?.map(term => `(?=.*${escapeRegexSpecialChars(term)})`).join(''), 'i');

        // Step 1: Attempt the initial search
        let searchData = await Movies.find({
            $or: [
                { title: startsWithQueryRegex },
                { title: { $regex: startsWithQueryRegex } },
                { tags: { $in: startsWithQueryRegex } },
            ],
        })
            .collation({ locale: 'en', strength: 2 })  // Ensure case-insensitive search
            .skip(skip)
            .limit(limit)
            .sort({ releaseYear: -1, fullReleaseDate: -1, _id: -1 })
            .select(selectFields + ' tags')
            .lean();

        // Step 3: Retry with complex search if no result
        if (searchData.length === 0) {

            searchData = await Movies.find({
                $or: [
                    { title: { $regex: fullQueryRegex } },
                    { title: { $in: fuzzyQueryRegex } },  // Fuzzy search for title
                    { tags: { $in: fullQueryRegex } },
                    { castDetails: { $in: fullQueryRegex } },
                    { searchKeywords: { $regex: fullQueryRegex } },
                    { genre: { $in: fullQueryRegex } },
                    { imdbId: cleanedQuery },
                    { releaseYear: parseInt(q, 10) || 0 },
                ],
            })
                .skip(skip)
                .limit(limit)
                .sort({ releaseYear: -1, fullReleaseDate: -1, _id: -1 })
                .select(selectFields + ' tags')
                .lean();
        }

        // Step 4: Rank search results based on matches
        if (searchData.length > 0) {
            const rankedResults = searchData.map(data => {
                const lowerTitle = data.title?.trim().toLowerCase();
                const lowerTitleWords = lowerTitle.split(' ');
            
                // Get tags from the current movie data
                const tags = data.tags || []; // Ensure tags is an empty array if undefined
            
                // Count how many times the search terms match the title or tags
                const matchCount = splitQuery.reduce((count, term) => {
                    let termCount = 0;
            
                    if (lowerTitleWords.includes(term)) termCount += 1;
                    if (tags && tags.includes(term) || tags.includes(cleanedQuery)) termCount += 1;
                    if (lowerTitle.startsWith(cleanedQuery)) termCount += 1;
                    if (tags && tags.some(tag => tag.startsWith(term))) termCount += 1;
                    if (lowerTitle.length === cleanedQuery.length) termCount += 1;
            
                    return count + termCount;
                }, 0);
            
                return { data, matchCount };
            });

            // Sort the results by matchCount
            rankedResults.sort((a, b) => b.matchCount - a.matchCount);

            const bestResultIds = new Set(rankedResults.map(result => result.data.imdbId?.toString()));
            const similarMatch = searchData.filter(data => !bestResultIds.has(data.imdbId?.toString()));

            searchData = [...rankedResults.map(result => result.data), ...similarMatch];
        }

        // Step 5: Clean response data (remove tags)
        searchData = searchData.map(({ tags, ...cleanedData }) => cleanedData);

        return res.status(200).json({ moviesData: searchData, endOfData: searchData.length < limit });
    } catch (error) {
        console.error("Error in searchHandler: ", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

//************* Get Latest Release Movies Controller  *************//
export async function getLatestReleaseMovie(req, res) {

    try {

        const querySlug = req.params.query?.toLocaleLowerCase().replace('-', ' ')

        const { limit, page, skip, bodyData } = req.body;

        // Creat query condition with filter
        const queryCondition = createQueryConditionFilter({
            query: {
                category: querySlug,
                fullReleaseDate: getDataBetweenDate({ type: 'months', value: 10 }),
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
            .select(selectFields)
            .sort({ ...sortFilterCondition, _id: 1 }).lean();

        const endOfData = (moviesData.length < limit - 1);

        // creat initial response data add more responses data as needed
        const response = { moviesData, endOfData: endOfData };

        // initial filterOption need
        const filteOptionsNeeded = ['type', 'genre'];

        if (page && page === 1) {
            response.filterOptions = await genarateFilters({
                query: queryCondition,
                filterNeed: filteOptionsNeeded
            })
        };

        return res.status(200).json(response);

    } catch (error) {
        console.log(error)
        return res.status(500).json({ message: "Internal Server Error" });
    };

};

//************* Get Recently Added Movies or Series Controller  *************//
export async function getRecentlyAddedContents(req, res) {

    try {

        const { limit, page, skip, bodyData } = req.body;

        // Get the date range condition
        const dateRange = getDataBetweenDate({ type: 'months', value: 2 });

        // creat query condition with filter
        const queryCondition = createQueryConditionFilter({
            query: {
                status: 'released',
                tags: { $nin: ['Cartoons'] },
                createdAt: { $exists: true, ...dateRange }
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
            .select(selectFields)
            .sort({ ...sortFilterCondition, createdAt: -1, _id: 1 }).lean();

        const endOfData = (moviesData.length < limit - 1);

        // creat initial response data add more responses data as needed
        const response = { moviesData, endOfData: endOfData };

        // initial filterOption need
        const filteOptionsNeeded = ['type', 'genre', 'industry', 'provider'];

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
};


//************* Get Movie Full Details Controller *************//

// imdbId validating  using regex pattern
const imdbIdPattern = /^tt\d{7,}$/;

export async function getMovieFullDetails(req, res) {
    try {
        const { imdbId } = req.params;
        const suggestion = req.query.suggestion === 'true';

        if (!imdbId || !imdbIdPattern.test(imdbId.trim())) {
            return res.status(400).json({ message: "IMDb ID is invalid" });
        };

        let dbQueryData;

        if (suggestion) {
            // Get movies data with download links using aggregation
            dbQueryData = await Movies.aggregate([
                {
                    $match: { imdbId }
                },
                {
                    $lookup: {
                        from: 'downloadlinks',
                        localField: 'imdbId',
                        foreignField: 'content_id',
                        as: 'downloadLinks'
                    }
                },
                {
                    $project: {
                        createdAt: 0
                    }
                }
            ]);
        } else {
            // Get movies data only for SEO Metadata
            dbQueryData = await Movies.findOne({
                imdbId
            }).select('-_id -createdAt -multiAudio -videoType -dispayTitle -watchLink -imdbRating -fullReleaseDate');
        };

        const movieData = suggestion ? dbQueryData[0] : dbQueryData;

        if (!movieData) {
            return res.status(404).json({ message: "Movie not found" });
        };

        // cehck if no suggestions need return only movie details
        if (!suggestion) {
            return res.status(200).json({ movieData });
        };

        const { genre, language, castDetails, category, watchLink } = movieData;

        const reorderWatchLinks = (watchLinks) => {
            const m3u8Link = watchLinks.find(link => link.includes('.m3u8') || link.includes('.mkv'));
            if (m3u8Link) {
                watchLinks = watchLinks.filter(link => link !== m3u8Link);
                watchLinks.unshift(m3u8Link);
            }
            return watchLinks.map((link, index) => ({
                source: link,
                label: `Server ${index + 1}`,
                labelTag: link.includes('.m3u8') || link.includes('.mkv') ? language.replace("hindi dubbed", "hindi") + ' (No Ads)' : '(Multi language)',
            }));
        };

        if (watchLink && Array.isArray(watchLink) && watchLink.length > 1) {
            let filterLinks = watchLink;
            if (watchLink.some(link => link.includes('jupiter.com'))) {
                filterLinks = watchLink.filter(link => !link.includes('ooat310wind.com/stream2'));
            }
            movieData.watchLink = reorderWatchLinks(filterLinks);
        };

        const filterGenre = genre.length > 1 && genre.includes("Drama")
            ? genre.filter(g => g !== "Drama")
            : genre;

        // Adjust skipMultiplyValue dynamically to vary the number of results skipped
        const skipMultiplyValue = filterGenre.length * 10 + Math.floor(Math.random() * 10);
        const randomSkip = Math.random() < 0.2 ? 0 : Math.floor(Math.random() * skipMultiplyValue);  // 20% chance to skip 0 results

        // Pipeline to suggest movies from both genre and castDetails
        const suggestionsPipeline = [
            {
                $facet: {
                    genreList: [
                        { $match: { genre: { $in: filterGenre }, category, imdbId: { $ne: imdbId }, status: 'released' } },
                        { $skip: randomSkip },
                        { $limit: Math.random() < 0.5 ? 20 : 25 }  // Randomize limit between 20 and 25
                    ],
                    castList: [
                        { $match: { castDetails: { $in: castDetails }, imdbId: { $ne: imdbId }, status: 'released' } },
                        { $limit: 25 }
                    ]
                }
            }
        ];

        const suggestions = await Movies.aggregate(suggestionsPipeline);

        // Movies hls source provide domain 
        const hlsSourceDomain = process.env.HLS_VIDEO_SOURCE_DOMAIN

        return res.status(200).json({
            movieData: {
                ...movieData,
                hlsSourceDomain
            },
            suggestions: suggestions[0]
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}


//************* Get Movies Embedded Source Controller **************//
export async function getEmbedVideo(req, res) {
    try {
        const { contentId } = req.body;

        const movie = await Movies.findOne({ imdbId: contentId }).select('-_id watchLink status').lean();

        if (!movie) {
            return res.status(404).json({ message: 'Content not found' });
        }

        return res.status(200).json({ source: movie.watchLink, status: movie.status });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}