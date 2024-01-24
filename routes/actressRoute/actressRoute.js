import { Router } from "express";
import Movies from '../../models/Movies.Model.js';
import { transformToCapitalize } from "../../utils/index.js";
import Actress from "../../models/Actress.Model.js";
import { uploadOnCloudinary } from "../../utils/cloudinary.js";

const router = Router();

router.get('/industry/:industry', async (req, res) => {
    try {

        const industry = req.params?.industry.toLowerCase() || " ";

        const actorsInIndustry = await Actress.find({ industry }).select('name avatar industry');

        if (actorsInIndustry.length===0) {

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
router.post('/collaction/:actorName', async (req, res) => {

    try {

        const actorName = transformToCapitalize(req.params?.actorName);

        const { limit, skip } = req.body;

        const pageSize = limit || 30;

        const searchRegex = new RegExp(actorName, 'i');

        const moviesData = await Movies.find({ castDetails: { $in: [searchRegex] }, status: 'released' })
            .skip(skip).limit(pageSize)
            .sort({ releaseYear: -1, fullReleaseDate: -1, _id: 1 })
            .select('imdbId title thambnail releaseYear type');

            if (!moviesData) {
                return res.status(404).json({ message: "Movies not found"});
            };

        const endOfData = moviesData.length < pageSize ? true : false;

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