import Movies from "../models/Movies.Model.js";

export async function countGenres({ query }) {

    // Query to count movies by genre
    const genreCounts = await Movies.aggregate([
        { $match: query },
        { $unwind: "$genre" },
        {
            $group: {
                _id: "$genre", // Change _id to genreName
                count: { $sum: 1 }
            }
        },
        {
            $project: {
                filterName: "$_id", // Rename _id to genreName
                count: 1,
                _id: 0 // Exclude _id field from the output
            }
        }
    ]);

    return genreCounts;

};