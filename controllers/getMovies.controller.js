import { genarateFilters } from "../utils/genarateFilter.js";
import Movies from "../models/Movies.Model.js";
import { createQueryConditionFilter, createSortConditions, getDataBetweenDate } from "../utils/dbOperations.js";

const selectValue = "-_id imdbId title thambnail releaseYear type";

// Search handler function
export async function searchHandler(req, res) {

    try {

        const { q } = req.query;

        const { limit = 30, skip = 0, bodyData } = req.body;

        if (!q) {
            return res.status(400).json({ message: "Invalid search query" });
        }

        // Remove extra spaces and convert to lowercase
        const cleanedQuery = q.trim().toLowerCase();

        // Create an array of regex patterns for each word in the query for title search
        const splitQuery = cleanedQuery.split(' ');

        // Create a single regex pattern for the entire query
        const searchRegex = new RegExp(cleanedQuery, 'i');

        // Construct a regex pattern for fuzzy search
        const fuzzyRegex = splitQuery?.map(term => `(?=.*${term})`).join('');

        const searchArryRegex = new RegExp(fuzzyRegex, 'i');

        // Create query condition with filter
        const queryCondition = createQueryConditionFilter({
            query: {
                $or: [
                    { title: { $regex: searchRegex } },
                    { title: { $in: searchArryRegex } }, // Fuzzy search for title
                    { tags: { $in: searchRegex } },
                    { castDetails: { $in: searchRegex } },
                    { searchKeywords: { $regex: searchRegex } },
                    { genre: { $in: searchRegex } },
                    { imdbId: cleanedQuery },
                    { releaseYear: parseInt(q, 10) || 0 },
                ],
            },
            filter: bodyData?.filterData
        });

        const searchData = await Movies.find(queryCondition)
            .skip(skip)
            .limit(limit)
            .sort({ releaseYear: -1, fullReleaseDate: -1, _id: -1 })
            .select(selectValue + ' tags').lean();

        const endOfData = searchData.length < limit;

        let searchResponse = searchData;

        const bestResult = searchData.map(data => {
            // Convert title to lowercase to match with query words and tags
            const cleanLowerTitle = data.title?.trim().toLowerCase();
            const lowerTitleWords = cleanLowerTitle.split(' ');

            const tags = data.tags && data.tags.length > 0 ? data.tags.map(tag => tag.toLowerCase()) : [];

            // Calculate match count for title and tags (separate checks for each condition)
            const matchCount = splitQuery.reduce((count, term) => {
                let termCount = 0; // Local counter for each term to track conditions met

                // Check if the term exists in title words
                if (lowerTitleWords.includes(term)) {
                    termCount += 1;  // Increment for title match
                }

                // Check if the term is in tags or if tags include the cleaned query
                if (tags.length > 0 && (tags.includes(term) || tags.includes(cleanedQuery))) {
                    termCount += 1;  // Increment for tag match
                }

                // Check if the title starts with the cleaned query
                if (cleanLowerTitle.startsWith(cleanedQuery)) {
                    termCount += 1;  // Increment for title starting with cleaned query
                }
                // Check if the term is in tags or if tags include the cleaned query
                if (tags.length > 0 && (tags.includes(term) || tags.includes(cleanedQuery))) {
                    termCount += 1;  // Increment for tag match
                };

                // Check if the term starts with any tag (only if tags exist)
                if (tags && tags.length > 0 && tags.some(tag => tag.startsWith(term))) {
                    termCount += 1;  // Increment if tag starts with the term
                }


                // increment the count if length is same
                if (cleanLowerTitle.length === cleanedQuery.length) {
                    termCount += 1;  // Increment for title starting with cleaned query
                }

                // Add the term's match count to the overall count
                return count + termCount;
            }, 0);

            // Check if title starts with any of the query words
            const startsWithCount = splitQuery.reduce((count, term) => {
                if (cleanedQuery.startsWith(cleanLowerTitle) || cleanLowerTitle.startsWith(term)) {
                    return count + 1;
                }
                return count;
            }, 0);

            return { data, matchCount, startsWithCount };
        });

        if (bestResult.length > 0) {
            // Sort bestResult by startsWithCount first, then by matchCount in descending order
            bestResult.sort((a, b) => {
                if (b.startsWithCount !== a.startsWithCount) {
                    return b.startsWithCount - a.startsWithCount;
                }
                return b.matchCount - a.matchCount;
            });

            // Extract the best results' data
            const bestResultData = bestResult.map(result => result.data);

            // If there are any entries in bestResult, remove these entries from searchData to form similarMatch
            const bestResultIds = new Set(bestResultData.map(data => data.imdbId.toString()));
            const similarMatch = searchData.filter(data => !bestResultIds.has(data.imdbId.toString()));

            searchResponse = [...bestResultData, ...similarMatch];
        }

        // Clean the response data by removing the tags field
        searchResponse = searchResponse.map((data) => {
            const { tags, ...cleanedData } = data;
            return cleanedData;
        });

        return res.status(200).json({ moviesData: searchResponse, endOfData });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};


//Get latest release movies 
export async function getLatestReleaseMovie(req, res) {

    try {

        const querySlug = req.params.query?.toLocaleLowerCase().replace('-', ' ')

        const { limit, page, skip, bodyData } = req.body;

        // creat query condition with filter
        const queryCondition = createQueryConditionFilter({
            query: {
                category: querySlug,
                fullReleaseDate: getDataBetweenDate({ type: 'months', value: 10 }),
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

//Get Recently Added Movies or Series Controller 
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
            .select(selectValue)
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