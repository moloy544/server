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
            imdbId,
            thambnail,
            title,
            releaseYear,
            fullReleaseDate,
            category,
            type,
            language,
            genre,
            watchLink,
            castDetails,
            searchKeywords
        } = req.body;

        const movieData = {
            imdbId,
            thambnail,
            title,
            releaseYear,
            fullReleaseDate,
            category,
            type,
            language,
            genre,
            watchLink,
            castDetails,
            searchKeywords
        };

        const isMovieAvailable = await Movies.findOne({
            $or: [
              { imdbId: imdbId }, // Correct imdbId
              { imbdid: imdbId }, // Misspelled imbdid
            ]
          });

        if (isMovieAvailable) {

            const updateMovie = await Movies.findOneAndUpdate(
                {
                  $or: [
                    { imdbId: imdbId }, // Correct imdbId
                    { imbdid: imdbId }, // Misspelled imbdid
                  ]
                },
                movieData,
                { new: true }
              );

            return res.status(200).json({ message: "Movie has been update with new data", movieData: updateMovie });
        };

        const movie = new Movies(movieData);

        const saveMovie = await movie.save();

        return res.status(200).json({ message: "Movie Added Successfull", movieData: saveMovie });

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal Server Error' });
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

//Delete movie route'
router.delete('/delete/:id', async (req, res) => {
    try {
        const mId = req.params?.id
        const deleteMovie = await Movies.findByIdAndDelete(mId);
        if (deleteMovie) {
            return res.status(200).send({ message: "Movie delete successfully" });
        } else {
            return res.status(400).send({ message: "Fail to delete movie" });
        }
    } catch (error) {
        console.log(error)
    }
})

//Route for add new actor 
router.post('/add_actor', async (req, res) => {

    try {

        const { avatar, name, industry } = req.body;

        const isActorAvailable = await Actress.findOne({ name: name });

        if (isActorAvailable) {

            const updateActor = await Actress.findOneAndUpdate(
                { name: name },
                { avatar: avatar },
                { industry: industry },
                { new: true },
            );

            return res.status(200).json({ message: "Actor has been update with new data", actor: updateActor });
        };

        const actorData = { avatar, name, industry };

        const actor = new Actress(actorData);

        const saveActor = await actor.save();

        return res.status(200).json({ message: "Actor Added Successfull", actorData: saveActor });

    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;