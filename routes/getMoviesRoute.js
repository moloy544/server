import { Router } from "express";
import { isValidObjectId } from "mongoose";
import axios from "axios";
import Movies from '../models/Movies.Model.js';

const router = Router();

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

        const { limit, page } = req.body;

        const pageSize = parseInt(limit) || 25; // Number of items per page

        // Calculate the number of items to skip
        const skipCount = (page - 1) * pageSize;

        const moviesData = await Movies.find({
            $or: [
                { category: filteQuery },
                { type: filteQuery },
                { language: filteQuery },
                { releaseYear: parseInt(filteQuery) || 0 }, // Exact match for releaseYear
            ],
        }).sort({ releaseYear: -1, _id: 1 })
            .skip(skipCount)
            .limit(pageSize)
            .select('title  thambnail releaseYear');

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

//Route For Client Category Listing /listing/category/:query
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

        const { limit, page } = req.body;

        const pageSize = parseInt(limit) || 25; // Number of items per page

        // Calculate the number of items to skip
        const skipCount = (page - 1) * pageSize;

        const searchRegex = new RegExp(filteGenre, 'i');

        const moviesData = await Movies.find({
            genre: { $in: [searchRegex] }
        }).sort({ releaseYear: -1, _id: 1 })
            .skip(skipCount)
            .limit(pageSize)
            .select('title  thambnail releaseYear');

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

        const { limit, page } = req.body;

        const pageSize = parseInt(limit) || 25; // Number of items per page

        // Calculate the number of items to skip
        const skipCount = (page - 1) * pageSize;

        const searchRegex = new RegExp(q, 'i');

        const moviesData = await Movies.find({
            $or: [
                { title: { $regex: searchRegex } },
                { category: { $regex: searchRegex } },
                { type: { $regex: searchRegex } },
                { language: { $regex: searchRegex } },
                { genre: { $in: [searchRegex] } },
                { castDetails: { $in: [searchRegex] } },
                { searchKeywords: { $regex: searchRegex } },
                { releaseYear: parseInt(q) || 0 },
            ],
        }).sort({ releaseYear: -1, _id: 1 }).skip(skipCount).limit(pageSize).select('title  thambnail releaseYear castDetails');

        const endOfData = moviesData.length < pageSize ? true : false;

        return res.status(200).json({ moviesData, endOfData: endOfData });

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

        const movieData = await Movies.findById(movieId);

        const watchLink = movieData?.watchLink?.split('/');

        const linkimbdId = watchLink[watchLink.length - 1];

        if (linkimbdId) {

            const omdbApiResponse = await axios.get(`https://www.omdbapi.com/?&apikey=5422c8e9&plot=full&i=${linkimbdId}`);

            if (omdbApiResponse.status === 200) {

                const { Released, imdbID } = omdbApiResponse.data;

                await Movies.findOneAndUpdate(
                    { _id: movieId },
                    { imdbId: imdbID },
                    { fullReleaseDate: Released },
                    { new: true }
                );

            } else {
                console.log(linkimbdId)
                await Movies.findOneAndUpdate(
                    { _id: movieId },
                    { imdbId: linkimbdId },
                    { new: true }
                );

            }

        }

        if (!movieData) {
            return res.status(404).json({ message: "Movie not found" })
        }

        return res.status(200).json({ movieData });

    } catch (error) {
        console.log(error)
        return res.status(500).json({ message: "Internal Server Error" });
    };

});


export default router;