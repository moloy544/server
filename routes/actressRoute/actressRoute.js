import { Router } from "express";
import Movies from '../../models/Movies.Model.js';
import Actress from "../../models/Actress.Model.js";
import { countGenres } from "../../lib/index.js";
import { createQueryConditionFilter } from "../../utils/index.js";

const router = Router();

const selectValue = "imdbId title thambnail releaseYear type";

router.post('/industry', async (req, res) => {
    try {

        const industry = req.body.industry?.toLowerCase();

        const actorsInIndustry = await Actress.find({ industry }).select('-_id imdbId name avatar industry');

        if (actorsInIndustry.length === 0) {
            return res.status(404).json({ message: 'No actress found in this industry' });
        };

        return res.status(200).json({ actors: actorsInIndustry, industry });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
})

router.post('/info/:imdbId', async (req, res) => {
    try {


        const imdbId = req.params.imdbId

        const actor = await Actress.findOne({ imdbId }).select('-_id imdbId name avatar industry');
        
        if (!actor) {

            return res.status(404).json({ message: 'Actor not found in our collaction' });
        };

        return res.status(200).json({ actor });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
});

//Route For Client Actress Listing /listing/actress/:query 
router.post('/collaction', async (req, res) => {

    try {

        const { limit, page, skip, bodyData } = req.body;

        const { actor } = bodyData;

        const { dateSort, ratingSort } = bodyData.filterData || {};

        const findActor = await Actress.findOne({ imdbId: actor }).select('name');

        if (!findActor) {
            return res.status(201).json({ message: 'Actor not found in our collaction' });
        };

        const searchRegex = new RegExp(findActor.name, 'i');

        // creat query condition with filter
        const queryCondition = createQueryConditionFilter({
            query: {
                castDetails: { $in: [searchRegex] },
                status: 'released'
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

        const moviesData = await Movies.find(queryCondition)
            .skip(skip).limit(limit)
            .sort({ ...sortFilterCondition, _id: 1 })
            .select(selectValue);

        if (!moviesData) {
            return res.status(404).json({ message: "Movies not found" });
        };

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