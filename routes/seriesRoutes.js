import { Router } from "express";
import Movies from '../models/Movies.Model.js';
import { createQueryConditionFilter, transformToCapitalize } from "../utils/index.js";
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
                    seriesData: { $slice: ['$seriesData', 20] },
                },
            },
        ];

        // Get Netflix, hotstar series separately
        const [netflixSeries, hotStarSeries] = await Promise.all([
            //netflix
            Movies.find({
            type: 'series',
            $or: [
                { tags: { $in: ['Netflix'] } },
                { searchKeywords: 'Netflix' },
            ],
        }).sort({ releaseYear: -1, fullReleaseDate: -1 })
            .limit(20).select(selectValue).lean().exec(),
        
            //hotstar
            Movies.find({
                type: 'series',
                $or: [
                    { tags: { $in: ['HotStar'] } },
                    { searchKeywords: 'HotStar' },
                ],
            }).sort({ releaseYear: -1, fullReleaseDate: -1 })
                .limit(20).select(selectValue).lean().exec(),
            
    ])

        const categoryResult = await Movies.aggregate(pipeline).exec();

        // Include Netflix series in the result
        const sectionOneData = {
            sliderSeries: [
                ...categoryResult.map(({ _id, seriesData }) => ({
                    title: `Watch ${_id} series`,
                    linkUrl: `series/${_id}`,
                    seriesData,
                })),
                {
                    title: 'Watch Netflix series',
                    linkUrl: 'series/netflix',
                    seriesData: netflixSeries,
                },
                {
                    title: 'Watch Hotstar series',
                    linkUrl: 'series/hotstar',
                    seriesData: hotStarSeries,
                },
            ],
        };

        return res.status(200).json({ seriesPageLayout: sectionOneData });
        
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
});

//Route For Client Category Listing /listing/category/:query
router.post('/:category', async (req, res) => {

    try {

        const category = req.params.category;

        const { limit, page, skip, bodyData } = req.body;

        const { dateSort, ratingSort } = bodyData?.filterData || {};

        const regex = new RegExp(category, 'i')

         // creat query condition with filter
         const queryCondition = createQueryConditionFilter({
            query: {
                type: 'series',
                $or: [
                    { category: category },
                    { tags: { $in: regex } },
                    { searchKeywords: regex },
                ],
            },
            filter: bodyData?.filterData
         });

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