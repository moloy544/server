
import Actors from "../../../models/Actors.Model.js";
import { uploadOnCloudinary } from "../../../utils/cloudinary.js";
import { bufferToDataUri } from "../../../utils/index.js";

// add actor controller
export async function addNewActor(req, res) {

    try {

        const { data } = req.body;

        const file = req.file;

        const parseData = data ? JSON.parse(data) : {};

        const { imdbId } = parseData;

        if (!imdbId) {
            return res.status(400).json({ message: "imdbId is required" });
        };

        const findActor = await Actors.findOne({ imdbId });

        // creat a new data object for store in database
        const newData = parseData;

        // if actor  is fond so update existing actor data
        if (findActor) {

            // check if actor data avatar is not equal to existing avatar so update and replace existing avatar to new avatar
            if (file) {

                const fileUri = bufferToDataUri(file);

                const uploadCloudinary = await uploadOnCloudinary({
                    image: fileUri,
                    publicId: findActor._id,
                    folderPath: "actor_avatar"
                });

                if (!uploadCloudinary.secure_url) {
                    return res.status(300).json({ message: "Error while upload on cloudinary" });
                };

                newData.avatar = uploadCloudinary.secure_url;
            };

            // Update the existing movie with the new data
            const updateActor = await Actress.findOneAndUpdate(
                { imdbId },
                { $set: newData },
                { new: true }
            );

            return res.status(200).json({ message: "Actor has been updated with new data", updateData: updateActor });

        };

        if (!file) {
            return res.status(400).json({ message: "Avatar is required" });
        };

        // if actor is not exist the add new actor document
        const newActor = new Actors(newData);
        const avatar = bufferToDataUri(file);

        // upload new actor avatar on cloudinary server
        const uploadCloudinary = await uploadOnCloudinary({
            image: avatar,
            publicId: newActor._id,
            folderPath: "actor_avatar"
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

        const actor = await Actors.findOne({ imdbId }).select('-_id -__v');

        if (!actor) {
            return res.status(404).json({ message: "Actor not found" });
        };

        return res.json({ actor });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}