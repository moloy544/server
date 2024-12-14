
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
            const updateActor = await Actors.findOneAndUpdate(
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

        const actor = await Actors.findOne({ imdbId }).select('-_id -__v').lean();

        if (!actor) {
            return res.status(404).json({ message: "Actor not found" });
        };

        return res.json({ actor });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

// Create a regex pattern for matching Cloudinary URLs
const searchRegex = new RegExp('https://res.cloudinary.com/moviesbazar/image/upload/', 'i');

// Controller function to update 20 actor thumbnails at a time and track success
export async function updateAllActorsAvatar(req, res) {
    try {
        const { batchLimit = 20 } = req.body;
        
        // Query 20 movies with thumbnails that match the regex, one batch per request
        const actors = await Actors.find({
            avatar: { $regex: searchRegex }
        })
            .select("avatar")  // Only select the thumbnail field
            .limit(batchLimit)  // Fetch only batchLimit images
            .lean();  // Return plain JS objects

        if (actors.length === 0) {
            return res.status(404).json({ message: "No actors found for update." });
        }

        let successCount = 0;  // Counter for successfully updated actors

        // Process each actors thumbnail
        const uploadPromises = actors.map(async (actor) => {
            try {
                const oldAvatar = actor.avatar;

                // Upload the old thumbnail to the new Cloudinary account
                const uploadResponse = await uploadOnCloudinary({
                    image: oldAvatar,
                    publicId: actor._id,  // Use actor ID as public ID in Cloudinary
                    folderPath: "actor_avatar"  // Destination folder in the new Cloudinary account
                });

                // Only update if the Cloudinary upload was successful (i.e., secure_url is returned)
                if (uploadResponse && uploadResponse.secure_url) {
                    const newAvatarUrl = uploadResponse.secure_url;

                    // First, update the movie record in MongoDB
                    const updateResult = await Actors.updateOne(
                        { _id: actor._id },
                        { $set: { avatar: newAvatarUrl } }
                    );

                    // Check if the MongoDB update was successful before adding the delete task to the queue
                    if (updateResult.modifiedCount > 0) {
                        successCount++;  // Increment success count for each successful update
                    } else {
                        // MongoDB update failed, do not delete the old image
                        console.error(`Failed to update MongoDB for actor ${movie._id}, skipping Cloudinary deletion.`);
                    }

                } else {
                    console.error(`No secure_url returned for actor ${movie._id}. Skipping update.`);
                }
            } catch (uploadError) {
                console.error(`Failed to upload avatar for actor ${movie._id}:`, uploadError);
            }
        });

        // Wait for all uploads to complete
        await Promise.all(uploadPromises);

        console.log(`Batch of ${batchLimit} processed. ${successCount} actor avatar updated successfully.`);
        return res.status(200).json({
            message: `Batch of ${batchLimit} processed. ${successCount} actor avatar updated successfully.`
        });

    } catch (error) {
        console.error('Error during the update process:', error);
        return res.status(500).json({ message: 'Internal server error during the update process.' });
    }
}
