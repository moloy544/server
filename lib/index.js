import Movies from "../models/Movies.Model.js";

/***** Get All Grenres With Count For The Current Query *******/
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
            },
            {
                $sort: { count: -1 } // Sort by count in descending order
            }
        ]);

        return { totalCount, genre: genreCounts };

    } catch (error) {
        console.error("Error counting genres:", error);
        throw error;
    }
};


/***** Get All Categories With Count For The Current Query  *******/
export async function countIndustry({ query }) {
    try {

        // Query to count movies by genre
        const industryCounts = await Movies.aggregate([
            { $match: query },
            { $unwind: "$category" },
            {
                $group: {
                  _id: "$category", 
                    count: { $sum: 1 }
                }
            },
            {
                $project: {
                    filter:"industry",
                    name: "$_id",
                    count: 1,
                    _id: 0 
                }
            },
            {
                $sort: { count: -1 } 
            }
        ]);

        return industryCounts;

    } catch (error) {
        console.error("Error counting genres:", error);
        throw error;
    }
};