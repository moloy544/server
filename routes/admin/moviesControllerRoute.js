import { Router } from "express";
import Movies from '../../models/Movies.Model.js';

const router = Router();

/****************** Movies Admin Panel Add Movies Route *****************/

router.post('/add_movie', async (req, res) => {

    try {

        const {
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

        const isMovieAvailable = await Movies.findOne({ title: title });

        if (isMovieAvailable) {
            return res.status(300).json({ message: "Movie has already added in data" });
        };

        const movieData = {
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

export default router;