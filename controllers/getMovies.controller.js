import Movies from "../models/Movies.Model.js";
import { latest } from "../utils/index.js";

const selectValue = "imdbId title thambnail releaseYear type";

//search handler function
export async function searchHandler(req, res) {

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
                { releaseYear: parseInt(q) || 0 },
            ],
        }).skip(skip).limit(pageSize)
            .sort({ releaseYear: -1, fullReleaseDate: -1, _id: 1 })
            .select(selectValue);

            const endOfData = (moviesData.length < pageSize - 1);

        return res.status(200).json({ moviesData: searchData, endOfData: endOfData });

    } catch (error) {
        console.log(error)
        return res.status(500).json({ message: "Internal Server Error" });
    };

};


//Get latest release movies 
export async function getLatestReleaseMovie(req, res) {

    try {

        const querySlug = req.params.query?.toLocaleLowerCase().replace('-', ' ')

        const { limit, skip } = req.body;

        const pageSize = limit || 30;

        const queryCondition = {
            category: querySlug,
            fullReleaseDate: latest(6),
            type: 'movie',
            status: 'released'
        };

        const moviesData = await Movies.find(queryCondition).skip(skip).limit(pageSize)
            .sort({ releaseYear: -1, fullReleaseDate: -1, _id: 1 })
            .select(selectValue);

            const endOfData = (moviesData.length < pageSize - 1);

        return res.status(200).json({ moviesData, endOfData: endOfData });

    } catch (error) {
        console.log(error)
        return res.status(500).json({ message: "Internal Server Error" });
    };

};
