import { Router } from "express";
import Movies from '../../models/Movies.Model.js';
import { transformToCapitalize } from "../../utils/index.js";
import Actress from "../../models/Actress.Model.js";
import { uploadOnCloudinary } from "../../utils/cloudinary.js";

const router = Router();

const selectValue = "imdbId title thambnail releaseYear type";

router.get('/industry/:industry', async (req, res) => {
    try {

        const industry = req.params?.industry.toLowerCase() || " ";

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

        //await updateActorData(actor);

        return res.status(200).json({ actor });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
});

//Route For Client Actress Listing /listing/actress/:query 
router.post('/collaction', async (req, res) => {

    try {

        const { limit, skip, bodyData } = req.body;

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

        const endOfData = (moviesData.length < pageSize - 1);

        return res.status(200).json({ moviesData, endOfData: endOfData });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    };
});

const updateActorData = async (actorData) => {

    if (actorData.length < 1) {
        console.log("Actor data is empty");
        return
    };

    const { avatar, _id } = actorData;

    const uploadCloudinary = await uploadOnCloudinary({
        image: avatar,
        imageId: _id,
        folderPath: "moviesbazaar/actress_avatar"
    });

    if (!uploadCloudinary) {
        console.log("Error while upload on cloudinary")
    };
    console.log(uploadCloudinary)

    const newAvatar = uploadCloudinary.secure_url || avatar;

    const newActorData = {
        avatar: newAvatar
    };

    const updateActor = await Actress.findOneAndUpdate(

        { _id },

        newActorData,

        { new: true }
    );
    console.log("Actor has been update with new data: ", updateActor)
};



export default router;