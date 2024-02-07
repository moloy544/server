import { Router } from "express";
import Movies from '../models/Movies.Model.js';
import { transformToCapitalize } from "../utils/index.js";
import { countGenres } from "../lib/index.js";

const router = Router();

const selectValue = "imdbId title thambnail releaseYear type";

router.post('/', async (req, res) => {

    try {

        const pipeline = [

            // Match documents of type 'series' and the specified categories
            {
                $match: {
                    type: 'series',
                    category: { $in: ['hollywood', 'bollywood', 'south'] }
                },
            },

            // Sort by releaseYear and fullReleaseDate
            { $sort: { releaseYear: -1, fullReleaseDate: -1 } },

            // Group documents by category
            {
                $group: {
                    _id: '$category',
                    seriesData: { $push: { imdbId: '$imdbId', title: '$title', thambnail: '$thambnail', releaseYear: '$releaseYear', type: '$type' } },
                },
            },

            // Project to limit each category to 15 results
            {
                $project: {
                    _id: 1,
                    seriesData: { $slice: ['$seriesData', 15] },
                },
            },
        ];

        // Get Netflix series separately
        const netflixSeries = await Movies.find({
            type: 'series',
            $or: [
                { tags: { $in: ['Netflix'] } },
                { searchKeywords: 'Netflix' },
            ],
        }).sort({ releaseYear: -1, fullReleaseDate: -1 })
            .limit(15)
            .select(selectValue)
            .lean()
            .exec();

        const result = await Movies.aggregate(pipeline).exec();

        // Include Netflix series in the result
        const sectionOneData = {
            sliderSeries: [
                ...result.map(({ _id, seriesData }) => ({
                    title: `Watch ${_id} series`,
                    linkUrl: `series/${_id}`,
                    seriesData,
                })),
                {
                    title: 'Watch Netflix series',
                    linkUrl: 'series/netflix',
                    seriesData: netflixSeries,
                },
            ],
        };

        return res.status(200).json({ series: sectionOneData });
        
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
});

//Route For Client Category Listing /listing/category/:query
router.post('/:category', async (req, res) => {

    try {

        const category = req.params.category;

        const capitalizeQuery = transformToCapitalize(category);

        const { limit, page, skip, bodyData } = req.body;

        const { dateSort, ratingSort, genreSort } = bodyData.filterData || {};

        const queryCondition = {

            type: 'series',

            $or: [
                { category: category },
                { tags: { $in: capitalizeQuery } },
                { searchKeywords: capitalizeQuery },
            ],
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

        const moviesData = await Movies.find(queryCondition).skip(skip).limit(limit)
            .sort({ ...sortFilterCondition, _id: 1 })
            .select(selectValue);

            let dataToSend = {};

        const endOfData = (moviesData.length < limit - 1);

        dataToSend = { moviesData, endOfData: endOfData };

        if (page && page === 1) {

            const genreCount = await countGenres({ query: queryCondition });

            dataToSend.filterCount = genreCount;
        };

        return res.status(200).json(dataToSend);

    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    };
});


export default router;