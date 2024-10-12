import { isValidObjectId } from "mongoose";
import Movies from "../../../models/Movies.Model.js";
import { deleteBackupAccountImage, deleteImageFromCloudinary, uploadOnCloudinary } from "../../../utils/cloudinary.js";
import { bufferToDataUri } from "../../../utils/index.js";

//add movie controller
export async function addNewMovie(req, res) {
    try {

        const { data, createdDateUpdate } = req.body;

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

                // Upload new thumbnail to Secomd Cloudinary Account
                const uploadCloudinary = await uploadOnCloudinary({
                    image: fileUri,
                    publicId: findMovie._id,
                    folderPath: "movies/thumbnails"
                });

                // delete image from backup cloudinary account before deleting thumbnail its check if is backup account image then delete
                deleteBackupAccountImage({
                    imageLink: findMovie.thambnail,
                    id: findMovie._id
                });

                if (!uploadCloudinary.secure_url) {
                    return res.status(500).json({ message: "Error while update thumbnail" });
                };

                // Update movieData with new thumbnail URL
                newData.thambnail = uploadCloudinary.secure_url
            };
            if (createdDateUpdate && createdDateUpdate === "yes") {
                newData.createdAt = Date.now();
            }
            // Update the existing movie with the new data
            const updateMovie = await Movies.findOneAndUpdate(
                { imdbId },
                { $set: newData },
                { new: true }
            );

            return res.status(200).json({ message: "Movie has been updated with new data", movieData: updateMovie });
        };

        // check if new movie thambnail is send or not if not send then send error message
        if (!file) {
            return res.status(400).json({ message: "Please provide a movie thumbnail" });
        };

        // creat a new movie document in mongodb
        const movie = new Movies({
            ...newData,
            createdAt: Date.now()
        });

        const fileUri = bufferToDataUri(file);

        // if movie is successfully saved then upload file in cloudinary
        const uploadCloudinary = await uploadOnCloudinary({
            image: fileUri,
            publicId: movie._id,
            folderPath: "movies/thumbnails"
        });

        // check upload fail in cloudinary then send error message
        if (!uploadCloudinary.secure_url) {
            return res.status(500).json({ message: "Error while uploading thumbnail" });
        };

        // add thumbnail to mongoose Model object
        movie.thambnail = uploadCloudinary.secure_url;

        // save the document in mongodb
        const saveMovie = await movie.save();

        // check if movie is save or not if not send then send error message and delete thumbnail from cloudinary
        if (!saveMovie) {
            deleteImageFromCloudinary({
                id: movie.id,
                imageLink: uploadCloudinary.secure_url
            })
            return res.status(500).json({ message: "Error while adding movie to the database" });
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

export async function makeDocumentsStringToArray(field) {

    try {

        // Update the documents
        await Movies.updateMany(
            { [field]: { $type: 'string' } },
            [
                {
                    $set: {
                        [field]: { $cond: { if: { $isArray: `$${field}` }, then: `$${field}`, else: [`$${field}`] } }
                    }
                }
            ]
        );

        console.log(`Field "${field}" updated successfully.`);
    } catch (error) {
        console.error(`Error updating field "${field}":`, error);
    };

}

export async function updateVideoSource(req, res) {

    try {
        const { domainToFind, newDomain } = req.body;

        if (!domainToFind || !newDomain) {
            return res.status(400).json({ message: 'Missing required fields: domainToFind, newDomain' });
        }
        // Find all documents that have watchLink matching the specified pattern
        const movies = await Movies.find({ watchLink: { $elemMatch: { $regex: `${domainToFind}` } } });

        // Create an array of promises for updating each document
        const updatePromises = movies.map(async (doc) => {
            // Update each watchLink that matches the specified pattern
            const updatedWatchLink = doc.watchLink.map(link => {
                if (link.includes(`${domainToFind}`)) {
                    return link.replace(`${domainToFind}`, `${newDomain}`);
                }
                return link;
            });

            // Update the document with the modified watchLink array
            await Movies.updateOne(
                { _id: doc._id },
                { $set: { watchLink: updatedWatchLink } }
            );
        });

        // Wait for all update operations to complete
        await Promise.all(updatePromises);

        return res.status(200).json({ message: 'Video Source updated successfully.' });

    } catch (error) {
        console.error('Error while updating Video Source', error);
        return res.status(500).json({ message: 'Internal server error while updating Video Source' });
    }
}