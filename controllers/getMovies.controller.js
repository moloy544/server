import { countGenres } from "../lib/index.js";
import Movies from "../models/Movies.Model.js";
import { getDataBetweenMonth } from "../utils/index.js";

const selectValue = "imdbId title thambnail releaseYear type";

//search handler function
export async function searchHandler(req, res) {

    try {

        const { q } = req.query;

        const { limit, skip } = req.body;

        const pageSize = limit || 25;

        const searchRegex = new RegExp(q, 'i');

        const searchData = await Movies.find({
            $or: [
                { title: { $regex: searchRegex } },
                { category: { $regex: searchRegex } },
                { type: { $regex: searchRegex } },
                { language: { $regex: searchRegex } },
                { genre: { $in: searchRegex } },
                { castDetails: { $in: searchRegex } },
                { searchKeywords: { $regex: searchRegex } },
                { tags: { $in: searchRegex } },
                { releaseYear: parseInt(q) || 0 },
            ],
        }).skip(skip).limit(pageSize)
            .sort({ releaseYear: -1, fullReleaseDate: -1, _id: 1 })
            .select(selectValue);

        const endOfData = (searchData.length < pageSize - 1);

        return res.status(200).json({ moviesData: searchData, endOfData: endOfData });

    } catch (error) {
        console.log(error)
        return res.status(500).json({ message: "Internal Server Error" });
    };

};


//Get latest release movies 
export async function getLatestReleaseMovie(req, res) {

    try {

        const querySlug = req.params.query?.toLocaleLowerCase().replace('-', ' ')

        const { limit, page, skip, bodyData } = req.body;

        const { sortFilter, categoryFilter } = bodyData.filterData

        const { dateSort, ratingSort } = sortFilter || {};

        const pageSize = limit || 30;

        const queryCondition = {
            category: querySlug,
            fullReleaseDate: getDataBetweenMonth(6),
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

        const moviesData = await Movies.find(queryCondition).skip(skip).limit(pageSize)
            .sort(sortFilterCondition)
            .select(selectValue);

            let dataToSend = {};

            const endOfData = (moviesData.length < pageSize - 1);
    
            dataToSend = { moviesData, endOfData: endOfData };
    
            if (page && page === 1) {
    
                const genreCount = await countGenres({ query: queryCondition });
    
                dataToSend.filterCount = { genre: genreCount };
            };
    
            return res.status(200).json(dataToSend);

    } catch (error) {
        console.log(error)
        return res.status(500).json({ message: "Internal Server Error" });
    };

};
