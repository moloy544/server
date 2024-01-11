import { Router } from "express";
import { isValidObjectId } from "mongoose";
import Movies from '../models/Movies.Model.js';

const router = Router();

const selectValue = "title thambnail releaseYear type";

//Route For Client Category Listing /listing/category/:query
router.post('/category/:category', async (req, res) => {

    try {

        const query = req.params?.category.toLowerCase().replace(/[-]/g, ' ');

        function filterQuery() {

            switch (query) {
                case 'new release':
                    return 2023;
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
                { releaseYear: parseInt(filteQuery) || 0 },

            ],
            fullReleaseDate: { $exists: false }
        }).sort({ releaseYear: -1, fullReleaseDate: -1 })
            .skip(skip)
            .limit(pageSize)
            .select(selectValue);

        if (!moviesData) {
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
        }).skip(skip).limit(pageSize);

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

        const movieId = req.body.movie;

        if (!isValidObjectId(movieId)) {
            return res.status(404).json({ message: "Invalid movie details" });
        };

        const movieData = await Movies.findById(movieId).select('-_id title thambnail watchLink genre language type releaseYear fullReleaseDate castDetails language');

        if (!movieData) {
            return res.status(404).json({ message: "Movie not found" })
        };

        return res.status(200).json({ movieData });

    } catch (error) {
        console.log(error)
        return res.status(500).json({ message: "Internal Server Error" });
    };

});


export default router;