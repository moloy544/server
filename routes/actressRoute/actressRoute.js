import { Router } from "express";
import Movies from '../../models/Movies.Model.js';
import { transformToCapitalize } from "../../utils/index.js";
import Actress from "../../models/Actress.Model.js";

const router = Router();

router.get('/industry/:industry', async (req, res) => {
    try {

        const industry = req.params?.industry.toLowerCase() || " ";

        const actorsInIndustry = await Actress.find({ industry }).select('name avatar industry');

        if (actorsInIndustry.length==0) {
        
            return res.status(204).json({ message: 'No actress found in this industry' });
        };

        return res.status(200).json({ actors: actorsInIndustry, industry });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
})

router.post('/info/:actorName', async (req, res) => {
    try {

        const actorname = transformToCapitalize(req.params?.actorName);

        const actor = await Actress.findOne({ name: actorname }).select('name avatar industry');

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
router.post('/collaction/:actorName', async (req, res) => {

    try {

        const actorName = transformToCapitalize(req.params?.actorName);

        const { limit, skip } = req.body;

        const pageSize = limit || 30;
        
        const searchRegex = new RegExp(actorName, 'i');

        const moviesData = await Movies.find({ castDetails: { $all: [searchRegex] } })
        .skip(skip).limit(pageSize)
        .sort({ releaseYear: -1, fullReleaseDate: -1, _id: 1 })
        .select('imdbId title thambnail releaseYear type');

        const endOfData = moviesData.length < pageSize ? true : false;

        return res.status(200).json({ moviesData, endOfData: endOfData });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    };
});

export default router;