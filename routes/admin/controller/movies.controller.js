import Movies from "../../../models/Movies.Model.js";
import { deleteImageFromCloudinary, uploadOnCloudinary } from "../../../utils/cloudinary.js";

//add movie controller
export async function addNewMovie(req, res) {
    try {

        const { data } = req.body;

        const { imdbId, thambnail } = data;

        const newData = { ...data };

        // Check if the movie is available
        const findMovie = await Movies.findOne({ imdbId });

        if (findMovie) {

            // If movie exists, update with new data
            if (thambnail && findMovie.thambnail !== thambnail) {

                // Upload new thumbnail to Cloudinary
                const uploadCloudinary = await uploadOnCloudinary({
                    image: thambnail,
                    publicId: findMovie._id,
                    folderPath: "moviesbazaar/thambnails"
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

        // If movie doesn't exist, add a new one
        const movie = new Movies(newData);
        const saveMovie = await movie.save();

        if (!saveMovie) {
            return res.status(500).json({ message: "Error while adding movie to the database" });
        };

        // Upload thumbnail to Cloudinary for the new movie
        if (thambnail) {
            const uploadCloudinary = await uploadOnCloudinary({
                image: thambnail,
                publicId: saveMovie._id,
                folderPath: "moviesbazaar/thambnails"
            });

            if (!uploadCloudinary.secure_url) {
                return res.status(500).json({ message: "Error while uploading to Cloudinary" });
            };

            // Update the new movie's thambnail field with the Cloudinary URL
            saveMovie.thambnail = uploadCloudinary.secure_url;

            await saveMovie.save();
        };

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
        }

        const deleteMovie = await Movies.deleteOne({ _id: id });

        if (deleteMovie.deletedCount > 0) {
            //Delete movie image from cloudinary server
            await deleteImageFromCloudinary({ publicId: `moviesbazaar/thambnails/${id}` });

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
export async function updateWatchLinkUrl(req, res) {

    try {

        const { newWatchLink, oldWatchLink } = req.body;

        const regexValue = new RegExp(oldWatchLink, 'i');

        const update = await Movies.updateMany(
            { watchLink: { $regex: regexValue } },

            [
                {
                    $set: {
                        watchLink: {
                            $concat: [newWatchLink, "$imdbId"]
                        }
                    }
                }
            ]
        );

        if (!update) {
            return res.status(200).json({ message: "Watch link are not update" });
        };

        return res.status(200).json({ message: `Total ${update.modifiedCount} data update with ${newWatchLink} this watch link` });

    } catch (error) {
        console.error("Error updating documents:", error);
        return res.status(500).json({ message: "Interal server error while updating watch link" });
    };
};
