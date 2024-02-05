import { Router } from "express";
import Movies from '../../models/Movies.Model.js';
import { transformToCapitalize } from "../../utils/index.js";
import Actress from "../../models/Actress.Model.js";
import { countGenres } from "../../lib/index.js";

const router = Router();

const selectValue = "imdbId title thambnail releaseYear type";

router.post('/industry', async (req, res) => {
    try {

        const industry = req.body.industry?.toLowerCase();

        const actorsInIndustry = await Actress.find({ industry }).select('name avatar industry');

        if (actorsInIndustry.length === 0) {

            return res.status(404).json({ message: 'No actress found in this industry' });
        };

        return res.status(200).json({ actors: actorsInIndustry, industry });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
})

router.post('/info', async (req, res) => {
    try {

        const { actorDetails } = req.body;

        const { industry, actorName } = actorDetails || {}

        const editedActorName = transformToCapitalize(actorName);

        const actor = await Actress.findOne({ name: editedActorName, industry }).select('name avatar industry');

        if (!actor) {
            return res.status(404).json({ message: 'Actor not found' });
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

        const { sortFilter, categoryFilter } = bodyData.filterData

        const { dateSort, ratingSort } = sortFilter || {};

        const pageSize = limit || 30;

        const searchRegex = new RegExp(actor, 'i');

        const queryCondition = {
            castDetails: { $in: [searchRegex] },
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

        const moviesData = await Movies.find(queryCondition)
            .skip(skip).limit(pageSize)
            .sort({ ...sortFilterCondition, _id: 1 })
            .select(selectValue);

        if (!moviesData) {
            return res.status(404).json({ message: "Movies not found" });
        };

        let dataToSend = {};

        const endOfData = (moviesData.length < pageSize - 1);

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