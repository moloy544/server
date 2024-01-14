import { Router } from "express";
import Movies from '../models/Movies.Model.js';

const router = Router();

const selectValue = "imdbId title thambnail releaseYear type";

//Route For Client Category Listing /listing/category/:query
router.post('/', async (req, res) => {

    try {

        const { limit, skip } = req.body;

        const pageSize = limit || 30;

        const moviesData = await Movies.find({
           type: 'series'
        }).skip(skip).limit(pageSize)
            .sort({ releaseYear: -1, fullReleaseDate: -1, _id: 1 })
            .select(selectValue);

        const endOfData = moviesData.length < pageSize ? true : false;

        return res.status(200).json({ moviesData, endOfData: endOfData });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal Server Error" });
    };
});



export default router;