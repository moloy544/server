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

//Update Movie Route
router.post('/update', async (req, res) => {

    try {
 
        const { title, updatedData } = req.body;

        const updateProduct = await Movies.findOneAndUpdate(
            { title },
            updatedData,
            { new: true }
        );

        if (!updateProduct){
            return res.status(400).send("Movie is not exists in movies records");
        }

        return res.status(200).json(updateProduct);

    } catch (error) {
        console.error(error.message);
        return res.status(500).send("Internal server error");
    }

});

export default router;