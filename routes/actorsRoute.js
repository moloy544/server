import { Router } from "express";
import Movies from '../models/Movies.Model.js';
import Actors from "../models/Actors.Model.js";
import { createQueryConditionFilter, createSortConditions } from "../utils/dbOperations.js";
import { genarateFilters } from "../utils/genarateFilter.js";

const router = Router();

const selectValue = "-_id imdbId title thambnail releaseYear type";

router.post('/industry', async (req, res) => {
    try {
        const { industry, skip = 0, limit = 30 } = req.body;
        const transformIndustry = industry?.toLowerCase();

        const actorsData = await Actors.find({ industry: transformIndustry })
            .select('-_id imdbId name avatar industry')
            .skip(skip)
            .limit(limit);

        if (skip === 0 && actorsData.length === 0) {
            return res.status(404).json({ message: 'No actress found in this industry' });
        };

        const dataIsEnd = (actorsData.length < limit);

        return res.status(200).json({ actors: actorsData, industry, dataIsEnd });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
})

router.post('/info/:imdbId', async (req, res) => {
    try {


        const imdbId = req.params.imdbId

        const actor = await Actors.findOne({ imdbId }).select('-_id imdbId name avatar industry');

        if (!actor) {

            return res.status(404).json({ message: 'Actor not found in our collaction' });
        };

        return res.status(200).json({ actor });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
});

// Route for Client Actress Listing /listing/actress/:query 
router.post('/collaction', async (req, res) => {
    try {
        const { limit, page, skip, bodyData } = req.body;
        const { actor, filterData } = bodyData;

        // Find actor by IMDb ID
        const findActor = await Actors.findOne({ imdbId: actor }).select('name');

        if (!findActor) {
            return res.status(201).json({ message: 'Actor not found in our collection' });
        }

        // Convert actor name to lowercase 
        const actorName = findActor.name?.toLowerCase();

        // Create a regex for search
        const searchRegex = new RegExp(actorName, 'i');

        // Create query condition with filter
        const queryCondition = createQueryConditionFilter({
            query: {
                castDetails: { $in: [searchRegex] },
                status: 'released'
            },
            filter: filterData
        });

        // Create sort data conditions based on user-provided filter
        const sortFilterCondition = createSortConditions({
            filterData,
            query: queryCondition
        });

        // Fetch movies data
        const moviesData = await Movies.find(queryCondition)
            .skip(skip)
            .limit(limit)
            .sort({ ...sortFilterCondition, _id: 1 })
            .select(selectValue + ' castDetails');

        if (!moviesData.length) {
            return res.status(404).json({ message: "Movies not found for this actor" });
        }

        // Filter movies to include only those where cast names match exactly or start with the actor name
        const filteredMovies = moviesData.filter((data) => {
            // Check if castDetails is defined and is an array
            if (!Array.isArray(data.castDetails)) {
                return false;
            }

            // Check if any cast member matches exactly or starts with the actor name
            return data.castDetails.some((cast) => {
                const lowerCaseCast = cast.toLowerCase();
                return lowerCaseCast === actorName || lowerCaseCast.startsWith(actorName);
            });
        });

        if (!filteredMovies.length) {
            return res.status(404).json({ message: "Movies not found for this actor" });
        }

        // Exclude 'castDetails' from the response
        const cleanedMovies = filteredMovies.map((movie) => {
            // Convert Mongoose document to plain object and exclude 'castDetails'
            const { castDetails, ...cleanedData } = movie.toObject(); // Convert Mongoose document to plain object
            return cleanedData;
        });

        const endOfData = (filteredMovies.length < limit);

        // Create initial response data and add more responses data as needed
        const response = {
            moviesData: cleanedMovies,
            endOfData: endOfData
        };

        // Initial filter options needed
        const filterOptionsNeeded = ['genre'];

        if (page && page === 1) {
            response.filterOptions = await genarateFilters({
                query: queryCondition,
                filterNeed: filterOptionsNeeded
            });
        }

        return res.status(200).json(response);

    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
});


export default router;