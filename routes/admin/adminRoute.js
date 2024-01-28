import { Router } from "express";
import Movies from '../../models/Movies.Model.js';
import Actress from "../../models/Actress.Model.js";
import { deleteImageFromCloudinary, uploadOnCloudinary } from "../../utils/cloudinary.js";

const router = Router();

/****************** Admin Panel Add Delete Update Movie Series and Actor Route *****************/

router.post('/add_movie', async (req, res) => {

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
                newData.thambnail =  uploadCloudinary.secure_url
            };

            // Update the existing movie with the new data
            const updateMovie = await Movies.findOneAndUpdate(
                { imdbId },
                { $set: newData },
                { new: true }
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
        return res.status(500).json({ message: 'Internal Server Error' });
    };
});


//Delete movie route'
router.delete('/delete/:id', async (req, res) => {
    try {

        const { id } = req.params;

        if (!id) {
            return res.status(400).send({ message: "Invalid request. Missing id." });
        };

        const deleteMovie = await Movies.findByIdAndDelete(id);

        if (deleteMovie) {

            //Delete movie image from cloudinary server
            await deleteImageFromCloudinary({ publicId: 'moviesbazaar/thambnails/' + id });

            return res.status(200).send({ message: "Movie delete successfully" });

        } else {
            return res.status(400).send({ message: "Fail to delete movie" });
        }
    } catch (error) {
        console.log(error)
    }
});


//Route for add new actor 
router.post('/add_actor', async (req, res) => {

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

            if (!uploadCloudinary) {
                return res.status(300).json({ message: "Error while upload on cloudinary" });
            };

            saveActor.avatar = uploadCloudinary.secure_url || avatar;

            return res.status(200).json({ message: "Actor Added Successfull", actorData: saveActor });

        } else {
            return res.status(500).json({ message: " Error while add  actor in to database" });

        };

    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;