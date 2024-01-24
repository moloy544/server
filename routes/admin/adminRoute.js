import { Router } from "express";
import Movies from '../../models/Movies.Model.js';
import Actress from "../../models/Actress.Model.js";
import { deleteImageFromCloudinary, uploadOnCloudinary } from "../../utils/cloudinary.js";

const router = Router();

/****************** Admin Panel Add Delete Update Movie Series and Actor Route *****************/

//Route for both Add new or update 
router.post('/add_movie', async (req, res) => {

    try {

        const { data } = req.body;

        const movieData = {
            ...data,
        };

        const imdbId = data.imdbId;
        const thambnail = data.thambnail

        //Check movie is available or not 
        const findMovie = await Movies.findOne({ imdbId: imdbId });

        //if movie is available so update with new data only
        if (findMovie) {

            if (thambnail && findMovie.thambnail !== thambnail) {

                const uploadCloudinary = await uploadOnCloudinary({
                    image: thambnail,
                    imageId: findMovie._id,
                    folderPath: "moviesbazaar/thambnails"
                });

                if (!uploadCloudinary) {
                    return res.status(500).json({ message: "Error while upload on cloudinary" });
                };

                movieData.thambnail = uploadCloudinary.secure_url || movieData.thambnail;
            };

            const updateMovie = await Movies.findOneAndUpdate(

                { imdbId: imdbId },

                movieData,

                { new: true }
            );

            return res.status(200).json({ message: "Movie has been update with new data", movieData: updateMovie });
        };

        const movie = new Movies(movieData);

        const saveMovie = await movie.save();

        if (saveMovie) {

            const uploadCloudinary = await uploadOnCloudinary({
                image: thambnail,
                imageId: saveMovie._id,
                folderPath: "moviesbazaar/thambnails"
            });

            if (!uploadCloudinary) {
                return res.status(500).json({ message: "Error while upload on cloudinary" });
            };

            saveMovie.thambnail = uploadCloudinary.secure_url || saveMovie.thambnail;

            return res.status(200).json({ message: "Movie Added Successfull", movieData: saveMovie });

        } else {

            return res.status(500).json({ message: "Error while add movie in to database" });

        };

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
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
            await deleteImageFromCloudinary({ publicId: 'moviesbazaar/thambnails/'+id });

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