import { isValidObjectId } from "mongoose";
import Movies from "../../../models/Movies.Model.js";
import { deleteImageFromCloudinary, uploadOnCloudinary } from "../../../utils/cloudinary.js";
import { bufferToDataUri } from "../../../utils/index.js";

//add movie controller
export async function addNewMovie(req, res) {
    try {

        const { data } = req.body;

        const file = req.file;

        const parseData = data ? JSON.parse(data) : {};

        // get movie imdb id
        const { imdbId } = parseData;

        // Check if the movie is available
        const findMovie = await Movies.findOne({ imdbId });

        // creat a new data object for store in database
        const newData = parseData;

        // check if movie already exist so update 
        if (findMovie) {

            // If new file is provided the upload new file in cloudinary
            if (file) {

                const fileUri = bufferToDataUri(file);

                // Upload new thumbnail to Cloudinary
                const uploadCloudinary = await uploadOnCloudinary({
                    image: fileUri,
                    publicId: findMovie._id,
                    folderPath: "movies/thumbnails"
                });

                if (!uploadCloudinary.secure_url) {
                    return res.status(500).json({ message: "Error while uploading to Cloudinary" });
                };

                // Update movieData with new thumbnail URL
                newData.thambnail = uploadCloudinary.secure_url
            };

            // Update the existing movie with the new data
            const updateMovie = await Movies.findOneAndUpdate(
                { imdbId },
                { $set: newData },
                { new: true, fields: { createdAt: 0 } }
            );

            return res.status(200).json({ message: "Movie has been updated with new data", movieData: updateMovie });
        };

        // check if new movie thambnail is send or not if not send then send error message
        if (!file) {
            return res.status(400).json({ message: "Please provide a movie thumbnail" });
        };

        // creat a new movie document in mongodb
        const movie = new Movies(newData);
        const saveMovie = await movie.save();

        // check if movie is save or not if not send then send error message
        if (!saveMovie) {
            return res.status(500).json({ message: "Error while adding movie to the database" });
        };

        const fileUri = bufferToDataUri(file);

        // if movie is successfully saved then upload file in cloudinary
        const uploadCloudinary = await uploadOnCloudinary({
            image: fileUri,
            publicId: saveMovie._id,
            folderPath: "movies/thumbnails"
        });

        // check upload fail in cloudinary then send error message
        if (!uploadCloudinary.secure_url) {
            return res.status(500).json({ message: "Error while uploading to Cloudinary" });
        };

        // Update the new movie's thambnail field with the Cloudinary URL
        saveMovie.thambnail = uploadCloudinary.secure_url;

        await saveMovie.save();

        return res.status(200).json({ message: "Movie added successfully", movieData: saveMovie });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Internal server error while add document' });
    };
};

//delete movie controller
export async function deleteMovie(req, res) {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).send({ message: "Invalid request. Missing id." });
        } else if (!isValidObjectId(id)) {
            return res.status(400).send({ message: "Invalid request. Invalid id format." });
        }

         // Fetch the movie to get the image link
         const movie = await Movies.findOne({ _id: id, });

         if (!movie) {
             return res.status(404).send({ message: "Movie not found" });
         }
 
         const imageLink = movie.thambnail; // Assuming imageLink is stored in the movie document
         
        const deleteMovie = await Movies.deleteOne({ _id: id });

        if (deleteMovie.deletedCount > 0) {

            //Delete movie image from cloudinary server
            await deleteImageFromCloudinary({ imageLink, id: id });

            return res.status(200).send({ message: "Movie deleted successfully" });
        } else {
            return res.status(400).send({ message: "Failed to delete movie or movie not found" });
        }
    } catch (error) {
        console.error("Error:", error);
        return res.status(500).send({ message: "Internal server error while deleting movie" });
    }
};

//Update movie watchlink 
export async function updateVideoSource(req, res) {

    try {

        const { videoSource, oldVideoSource } = req.body

        const regexValue = new RegExp(oldVideoSource, 'i');

        const update = await Movies.updateMany(
            { watchLink: { $regex: regexValue } },

            [
                {
                    $set: {
                        watchLink: {
                            $concat: [videoSource, "$imdbId"]
                        }
                    }
                }
            ]
        );

        return res.json({
            message: `Video source update successfull. modifiedCount: ${update.modifiedCount} and matchedCount: ${update.matchedCount}`
        });

    } catch (error) {
        console.error("Error while updatte video source:", error);
        return res.status(500).send({ message: "Internal server error while updating video source" });
    };
};
