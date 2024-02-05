import Actress from "../../../models/Actress.Model.js";
import { uploadOnCloudinary } from "../../../utils/cloudinary.js";

export async function addNewActor(req, res) {

    try {

        const { actorData } = req.body;

        const { avatar, name, industry } = actorData || {};

        const isActorAvailable = await Actress.findOne({ name, industry });

        if (isActorAvailable) {

            return res.status(300).json({ message: `Actor already exist in ${industry} with name ${name}`, });
        };

        const actor = new Actress(actorData);

        const saveActor = await actor.save();

        if (saveActor) {

            const uploadCloudinary = await uploadOnCloudinary({
                image: avatar,
                imageId: saveActor._id,
                folderPath: "moviesbazaar/actress_avatar"
            });

            if (!uploadCloudinary.secure_url) {
                return res.status(300).json({ message: "Error while upload on cloudinary" });
            };

            saveActor.avatar = uploadCloudinary.secure_url;

            await saveActor.save();

            return res.status(200).json({ message: "Actor Added Successfull", actorData: saveActor });

        } else {
            return res.status(500).json({ message: " Error while add  actor in to database" });

        };

    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal Server Error' });
    };

};

export async function updateActor(req, res) {

    try {

        const id = req.params.id

        const { data } = req.body;

        const { avatar } = data;

        const newData = { ...data };

        // Check if the actor is available
        const findActor = await Actress.findById(id);

        if (!findActor){
             return res.status(404).json({ message: "Actor not found" });
        };

        // If Actor exists, update with new data
        if (avatar && findActor.avatar !== avatar) {

            // Upload new thumbnail to Cloudinary
            const uploadCloudinary = await uploadOnCloudinary({
                image: avatar,
                publicId: id,
                folderPath: "moviesbazaar/actress_avatar"
            });

            if (!uploadCloudinary.secure_url) {
                return res.status(500).json({ message: "Error while uploading to Cloudinary" });
            };

            // Update actorData with new avatar URL
            newData.avatar = uploadCloudinary.secure_url
        };

        // Update the actor with the new data
        const updateMovie = await Actress.findOneAndUpdate(
            { _id: id },
            { $set: newData },
            { new: true }
        );

        return res.status(200).json({ message: "Actor has been updated with new data", actorData: updateMovie });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Internal Server Error' });
    };
};