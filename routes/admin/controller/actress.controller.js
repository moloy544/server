import Actress from "../../../models/Actress.Model.js";
import { uploadOnCloudinary } from "../../../utils/cloudinary.js";

// add actor controller
export async function addNewActor(req, res) {

    try {

        const { actorData } = req.body;

        const { imdbId, avatar } = actorData || {};

        const findActor = await Actress.findOne({ imdbId });

        // if actor  is fond so update existing actor data
        if (findActor) {

            // check if actor data avatar is not equal to existing avatar so update and replace existing avatar to new avatar
            if (avatar && findActor.avatar !== avatar) {

                const uploadCloudinary = await uploadOnCloudinary({
                    image: avatar,
                    imageId: findActor._id,
                    folderPath: "moviesbazaar/actress_avatar"
                });

                if (!uploadCloudinary.secure_url) {
                    return res.status(300).json({ message: "Error while upload on cloudinary" });
                };

                actorData.avatar = uploadCloudinary.secure_url;
            };

            // Update the existing movie with the new data
            const updateActor = await Actress.findOneAndUpdate(
                { imdbId },
                { $set: actorData },
                { new: true }
            );

            return res.status(200).json({ message: "Actor has been updated with new data", updateData: updateActor });

        };

        // if actor is not exist the add new actor document

        const newActor = new Actress(actorData);

        // upload new actor avatar on cloudinary server
        const uploadCloudinary = await uploadOnCloudinary({
            image: avatar,
            imageId: newActor._id,
            folderPath: "moviesbazaar/actress_avatar"
        });

        if (!uploadCloudinary.secure_url) {
            return res.status(300).json({ message: "Error while upload on cloudinary" });
        };

        newActor.avatar = uploadCloudinary.secure_url;

        await newActor.save();

        return res.status(200).json({ message: "Actor Added Successfull", actorData: newActor });

    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal Server Error' });
    };

};

// get actor data controller
export async function getActorData(req, res) {

    try {

        const { imdbId } = req.body || {};

        const actor = await Actress.findOne({ imdbId }).select('-_id -__v');

        if (!actor) {
            return res.status(404).json({ message: "Actor not found" });
        };

        return res.json({ actor });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}