import { Router } from "express";
import Movies from '../models/Movies.Model.js';
import Actress from "../models/Actors.Model.js";
import { createQueryConditionFilter, createSortConditions } from "../utils/dbOperations.js";
import { genarateFilters } from "../utils/genarateFilter.js";

const router = Router();

const selectValue = "imdbId title thambnail releaseYear type";

router.post('/industry', async (req, res) => {
    try {
        const { industry, skip, limit = 30 } = req.body;
        const transformIndustry = industry?.toLowerCase();

        const actorsData = await Actress.find({ industry: transformIndustry })
            .select('-_id imdbId name avatar industry')
            .skip(skip || 0)
            .limit(limit);

        if (actorsData.length === 0) {
            return res.status(404).json({ message: 'No actress found in this industry' });
        };

        const dataIsEnd = (actorsData.length < limit - 1);

        return res.status(200).json({ actors: actorsData, industry, dataIsEnd });

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

        const { actor, filterData } = bodyData;

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
            filter: filterData
        });

        // creat sort data conditions based on user provided filter
        const sortFilterCondition = createSortConditions({
            filterData,
            query: queryCondition
        });

        const moviesData = await Movies.find(queryCondition)
            .skip(skip).limit(limit)
            .sort({ ...sortFilterCondition, _id: 1 })
            .select(selectValue);

        if (!moviesData) {
            return res.status(404).json({ message: "Movies not found" });
        };

        const endOfData = (moviesData.length < limit - 1);

        // creat initial response data add more responses data as needed
        const response = { moviesData, endOfData: endOfData };

        // initial filterOption need
        const filteOptionsNeeded = ['genre'];

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


export default router;