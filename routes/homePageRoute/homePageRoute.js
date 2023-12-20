import { Router } from "express";
import Movies from '../../models/Movies.Model.js';

const router = Router();

//Get Movies By Category Listing
router.get('/', async (req, res) => {

    try {

        const latestYear = 2023;

        const [latestMovies, bollywoodMovies, southMovies] = await Promise.all([

            //Latest release movies
            Movies.find({ releaseYear: latestYear }).limit(20).lean().exec(),

            // Bollywood latest release movies
            Movies.find({
                category: 'bollywood',
                releaseYear: 2023,
                type: 'movie'
            }).limit(20).lean().exec(),

            // South latest release movies
            Movies.find({
                category: 'south',
                releaseYear: 2023,
                type: 'movie'
            }).limit(20).lean().exec(),

        ]);

        const allData = { latestMovies, bollywoodMovies, southMovies }

        return res.status(200).json(allData);

    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    };
});

export default router;