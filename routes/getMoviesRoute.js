import { Router } from "express";
import { isValidObjectId } from "mongoose";
import Movies from '../models/Movies.Model.js';

const router = Router();

//Route For Client Category Listing /listing/category/:query
router.post('/category/:category', async (req, res) => {

    try {

        const query = req.params?.category;

        const { limit, page } = req.body;

        const pageSize = parseInt(limit) || 25; // Number of items per page

        // Calculate the number of items to skip
        const skipCount = (page - 1) * pageSize;

        const searchRegex = new RegExp(query, 'i');

        const moviesData = await Movies.find({
            $or: [
                { category: { $regex: searchRegex } },
                { type: { $regex: searchRegex } },
                { language: { $regex: searchRegex } },
                { genre: { $in: [searchRegex] } }, // Searching array field using $in
                { releaseYear: parseInt(query) || 0 }, // Exact match for releaseYear
            ],
        })
            .sort({ releaseYear: -1, _id: 1 })
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