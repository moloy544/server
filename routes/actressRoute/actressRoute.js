import { Router } from "express";
import Movies from '../../models/Movies.Model.js';
import { transformToCapitalize } from "../../utils/index.js";
import Actress from "../../models/Actress.Model.js";

const router = Router();

router.post('/info/:actorName', async (req, res) => {
    try {

        const actorname = transformToCapitalize(req.params?.actorName);

        const actor = await Actress.findOne({ name: actorname }).select('-_id name avatar');

        if (!actor) {
            return res.status(404).json({ message: 'Actor not found' });
        };

        Actress.findOneAndUpdate(
            { name: actorname },
            { imdbId: imdbID },
            { fullReleaseDate: Released },
            { new: true }
        );

        return res.status(200).json({ actor });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
})

//Route For Client Actress Listing /listing/actress/:query 
router.post('/collaction/:actorName', async (req, res) => {

    try {

        const actorName = transformToCapitalize(req.params?.actorName);

        const { limit, page } = req.body;

        const pageSize = parseInt(limit) || 25; // Number of items per page

        // Calculate the number of items to skip
        const skipCount = (page - 1) * pageSize;

        const searchRegex = new RegExp(actorName, 'i');

        const moviesData = await Movies.find({ castDetails: { $all: [searchRegex] } })
            .sort({ releaseYear: -1, _id: 1 })
            .skip(skipCount)
            .limit(pageSize)
            .select('title thambnail releaseYear');

        const endOfData = moviesData.length < pageSize ? true : false;

        return res.status(200).json({ moviesData, endOfData: endOfData });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    };
});

export default router;