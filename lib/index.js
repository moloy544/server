import Movies from "../models/Movies.Model.js";

export async function countGenres({ query }) {
    try {
        // Count total number of movies based on the query condition
        const totalCount = await Movies.countDocuments(query);

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

        return { totalCount, genre: genreCounts };

    } catch (error) {
        console.error("Error counting genres:", error);
        throw error;
    }
};