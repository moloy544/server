import { countGenres, countIndustry } from "../lib/index.js";
import Movies from "../models/Movies.Model.js";
import { createQueryConditionFilter, createSortConditions, getDataBetweenDate } from "../utils/dbOperations.js";

const selectValue = "-_id imdbId title thambnail releaseYear type";

//search handler function
export async function searchHandler(req, res) {
    try {
        const { q } = req.query;
        const { limit, skip } = req.body;
        const pageSize = limit || 25;

        // Remove extra spaces and convert to lowercase
        const cleanedQuery = q.trim().toLowerCase().trimEnd();

        // Split the query into individual terms
        const terms = cleanedQuery.split(' ');

        // Construct a regex pattern for fuzzy search
        const fuzzyRegex = terms?.map(term => `(?=.*${term})`).join('');

        const searchRegex = new RegExp(fuzzyRegex, 'i');

        const searchData = await Movies.find({
            $or: [
                { title: { $regex: searchRegex } },
                { castDetails: { $in: searchRegex } },
                { searchKeywords: { $regex: searchRegex } },
                { tags: { $in: q } },
                { imdbId: q },
                { releaseYear: parseInt(q) || 0 },
            ],
            status: 'released'
        }).skip(skip).limit(pageSize)
            .sort({ releaseYear: -1, fullReleaseDate: -1, _id: 1 })
            .select(selectValue);

        const endOfData = (searchData.length < pageSize - 1);

        // Create bestResult array
        const bestResult = searchData.filter((data) => data.title?.toLowerCase().startsWith(q.toLowerCase()))

        // If there are any entries in bestResult, remove these entries from searchData to form similerMatch
        let similerMatch = searchData;
        let searchResponse = searchData; 

        if (bestResult.length > 0) {
            const bestResultIds = new Set(bestResult.map((data) => data.imdbId.toString()));
            similerMatch = searchData.filter((data) => !bestResultIds.has(data.imdbId.toString()));
            searchResponse = [...bestResult, ...similerMatch];
        }

        return res.status(200).json({ moviesData: searchResponse, bestResult, endOfData: endOfData });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}


//Get latest release movies 
export async function getLatestReleaseMovie(req, res) {

    try {

        const querySlug = req.params.query?.toLocaleLowerCase().replace('-', ' ')

        const { limit, page, skip, bodyData } = req.body;

        // creat query condition with filter
        const queryCondition = createQueryConditionFilter({
            query: {
                category: querySlug,
                fullReleaseDate: getDataBetweenDate({ type: 'months', value: 6 }),
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

        let dataToSend = {};

        const endOfData = (moviesData.length < limit - 1);

        dataToSend = { moviesData, endOfData: endOfData };

        if (page && page === 1) {

            const genreCount = await countGenres({ query: queryCondition });

            dataToSend.genreFilter = genreCount;
        };

        return res.status(200).json(dataToSend);

    } catch (error) {
        console.log(error)
        return res.status(500).json({ message: "Internal Server Error" });
    };

};

//Get Recently Added Movies or Series Controller 
export async function getRecentlyAddedMovie(req, res) {

    try {

        const { limit, page, skip, bodyData } = req.body;

        // Get the date range condition
        const dateRange = getDataBetweenDate({ type: 'days', value: 20 });

        // creat query condition with filter
        const queryCondition = createQueryConditionFilter({
            query: {
                type: 'movie',
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
            .sort({ ...sortFilterCondition, createdAt: -1, _id: 1 });

        let dataToSend = {};

        const endOfData = (moviesData.length < limit - 1);

        dataToSend = { moviesData, endOfData: endOfData };

        if (page && page === 1) {

            const [genreCount, industryCount] = await Promise.all([
                countGenres({ query: queryCondition }),
                countIndustry({ query: queryCondition })
            ])
            dataToSend.genreFilter = genreCount;
            dataToSend.industryFilter = industryCount;
        };

        return res.status(200).json(dataToSend);

    } catch (error) {
        console.log(error)
        return res.status(500).json({ message: "Internal Server Error" });
    };
};


