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
                {imdbId: q},
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

        const { dateSort, ratingSort, genreSort } = bodyData.filterData || {};

        const queryCondition = {
            category: querySlug,
            fullReleaseDate: getDataBetweenMonth(6),
            type: 'movie',
            status: 'released'
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

        const moviesData = await Movies.find(queryCondition) .skip(skip).limit(limit)
        .select(selectValue)
        .sort({ ...sortFilterCondition, _id: 1 });

            let dataToSend = {};

            const endOfData = (moviesData.length < limit - 1);
    
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
