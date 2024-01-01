import { Router } from "express";
import Movies from '../../models/Movies.Model.js';
import { isValidObjectId } from "mongoose";
import Actress from "../../models/Actress.Model.js";

const router = Router();

/****************** Movies Admin Panel Add Movies Route *****************/

//Route for add new movie
router.post('/add_movie', async (req, res) => {

    try {

        const {
            imbdId,
            thambnail,
            title,
            releaseYear,
            category,
            type,
            language,
            genre,
            watchLink,
            castDetails,
            searchKeywords
        } = req.body;

        const isMovieAvailable = await Movies.findOne({ watchLink: watchLink });

        if (isMovieAvailable) {
            return res.status(300).json({ message: "Movie has already added in data" });
        };

        const movieData = {
            imbdId,
            thambnail,
            title,
            releaseYear,
            category,
            type,
            language,
            genre,
            watchLink,
            castDetails,
            searchKeywords
        }

        const movie = new Movies(movieData);

        const saveMovie = await movie.save();

        return res.status(200).json({ message: "Movie Added Successfull", movieData: saveMovie });

    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

//Route for update movie by id
router.put('/update/:movieId', async (req, res) => {

    try {

        const movieId = req.params.movieId

        if (!isValidObjectId(movieId)) {
            return res.status(400).send("Invalid Movie Details");
        }

        const { updateData } = req.body;

        const updateMovie = await Movies.findOneAndUpdate(
            { _id: movieId },
            updateData,
            { new: true }
        );

        if (!updateProduct) {
            return res.status(400).send("Movie is not exists in movies records");
        }

        return res.status(200).json(updateMovie);

    } catch (error) {
        console.error(error.message);
        return res.status(500).send("Internal server error");
    }

});

//Route for add new actor 
router.post('/add_actor', async (req, res) => {

    try {

        const { avatar, name } = req.body;

        const isActorAvailable = await Actress.findOne({ name: name });

        if (isActorAvailable) {

            const updateActor = await Actress.findOneAndUpdate(
                { name: name },
                { avatar: avatar },
                { new: true },
            );

            return res.status(200).json({ message: "Actor has been update with new data", actor: updateActor });
        };

        const actorData = { avatar, name };

        const actor = new Actress(actorData);

        const saveActor = await actor.save();

        return res.status(200).json({ message: "Actor Added Successfull", actorData: saveActor });

    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;