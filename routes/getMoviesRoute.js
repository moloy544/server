import { Router } from "express";
import { isValidObjectId } from "mongoose";
import Movies from '../models/Movies.Model.js';
import axios from "axios";

const router = Router();

const selectValue = "-_id imdbId title thambnail releaseYear type";

//Route For Client Category Listing /listing/category/:query
router.post('/category/:category', async (req, res) => {

    try {

        const query = req.params?.category.toLowerCase().replace(/[-]/g, ' ');

        function filterQuery() {

            switch (query) {
                case 'new release':
                    return [2023, 2024];
                default:
                    return query;
            };
        };

        const filteQuery = filterQuery();

        const { limit, skip } = req.body;

        const pageSize = limit || 30;

        const moviesData = await Movies.find({
            $or: [
                { category: filteQuery },
                { language: filteQuery },
                {
                    releaseYear: {
                        $in: Array.isArray(filteQuery) ? filteQuery : [parseInt(filteQuery) || 0]
                    }
                }
            ]
        }).sort({ releaseYear: -1, fullReleaseDate: -1 })
            .skip(skip)
            .limit(pageSize)
            .select(selectValue);

        if (moviesData.length===0) {
            return res.status(404).send({ message: "Movies not found" });
        };

        const endOfData = moviesData.length < pageSize ? true : false;

        return res.status(200).json({ moviesData, endOfData: endOfData });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    };
});


//Get movies by genre
router.post('/genre/:genre', async (req, res) => {

    try {

        const genre = req.params?.genre.toLowerCase().replace(/[-]/g, ' ');

        function filterQuery() {

            switch (genre) {

                case 'sci fi':
                    return 'Sci-Fi';
                default:
                    return genre;
            };
        };

        const filteGenre = filterQuery();

        const { limit, skip } = req.body;

        const pageSize = limit || 30;

        const searchRegex = new RegExp(filteGenre, 'i');

        const moviesData = await Movies.find({
            genre: { $in: [searchRegex] }
        }).sort({ releaseYear: -1, fullReleaseDate: -1 })
            .skip(skip)
            .limit(pageSize)
            .select(selectValue);

        const endOfData = moviesData.length < pageSize ? true : false;

        return res.status(200).json({ moviesData, endOfData: endOfData });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    };
});


//Route for client search page
router.post('/search', async (req, res) => {

    try {

        const { q } = req.query;

        const { limit, skip } = req.body;

        const pageSize = limit || 25;

        const searchRegex = new RegExp(q, 'i');

        const searchData = await Movies.find({
            $or: [
                { title: { $regex: searchRegex } },
                { category: { $regex: searchRegex } },
                { type: { $regex: searchRegex } },
                { language: { $regex: searchRegex } },
                { genre: { $in: [searchRegex] } },
                { castDetails: { $in: [searchRegex] } },
                { searchKeywords: { $regex: searchRegex } },
                { watchLink: q },
                { releaseYear: parseInt(q) || 0 },
            ],
        }).skip(skip)
        .limit(pageSize)
        .select(selectValue);

        const endOfData = searchData.length < pageSize ? true : false;

        return res.status(200).json({ searchData, endOfData: endOfData });

    } catch (error) {
        console.log(error)
        return res.status(500).json({ message: "Internal Server Error" });
    };

});

//Get Singke Movie Datails
router.post('/details_movie', async (req, res) => {

    try {

        const imdbId = req.body.movie;

        const movieData = await Movies.findOne({ imdbId: 'tt'+imdbId }).select('title thambnail watchLink genre language type releaseYear fullReleaseDate castDetails language imdbRating');

        if (!movieData) {
            return res.status(404).json({ message: "Movie not found" })
        };

        return res.status(200).json({ movieData });

    } catch (error) {
        console.log(error)
        return res.status(500).json({ message: "Internal Server Error" });
    };

});


async function updateMovie(movieData) {
    try {

        if (!movieData) {
            return null;
        }

        const movieImdbId = movieData?.imdbId;

        const omdbResponse = await axios.get(`https://www.omdbapi.com/?&apikey=5422c8e9&plot=full&i=${movieImdbId}`);

        if (omdbResponse.status === 200) {

            const { Released, Actors } = omdbResponse.data;

            const actorsArray = Actors.split(',').map(actor => actor.trim());

            const updateMovie = await Movies.findOneAndUpdate(
                { imdbId: movieImdbId },
                {
                    $set: {
                        fullReleaseDate: Released,
                        castDetails: actorsArray,
                    }
                },
                { new: true })
            console.log(updateMovie)
        }
    } catch (error) {
        console.log(error);
    }
};


export default router;