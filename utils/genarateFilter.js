import { filterOptionsOnject } from "../constant/filterOptions.js";
import Movies from "../models/Movies.Model.js";

/***** Get All Grenres With Count For The Current Query *******/
async function countGenres({ query }) {
    try {

        const [totalCount, genreCounts] = await Promise.all([

            // Count total number of movies based on the query condition
            Movies.countDocuments(query),

            // Query to count movies by genre
            Movies.aggregate([
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
                        filter: "genre",
                        name: "$_id", // Rename _id to genreName
                        count: 1,
                        _id: 0 // Exclude _id field from the output
                    }
                },
                {
                    $sort: { count: -1 } // Sort by count in descending order
                }
            ])
        ]);

        // add all count with filter all field at beggining of array
        genreCounts.unshift({ count: totalCount, filter: 'genre', name: 'all' });

        return genreCounts;

    } catch (error) {
        console.error("Error counting genres:", error);
        throw error;
    }
};


/***** Get All Categories With Count For The Current Query  *******/
async function countIndustry({ query }) {
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
                    filter: "industry",
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

export async function genarateFilters({ query, filterNeed }) {

    const { providerOptions, typeOptions } = filterOptionsOnject

    const filterOptions = [];

    const genreNeed = filterNeed.includes('genre');
    const industryNeed = filterNeed.includes('industry');
    const typeNeed = filterNeed.includes('type');
    const providerNeed = filterNeed.includes('provider');

    const [genreFilter, industryFilter] = await Promise.all([
        genreNeed && countGenres({ query }),
        industryNeed && countIndustry({ query })
    ])
    if (genreNeed && genreFilter) {
        filterOptions.push({ title: 'Filter by genre', data: genreFilter })
    };

    if (industryNeed && industryFilter) {
        filterOptions.push({ title: 'Filter by industry', data: industryFilter })
    };

    if (typeNeed) {
        filterOptions.push(typeOptions)
    };
    
    if (providerNeed) {
        filterOptions.push(providerOptions)
    }
    return filterOptions;
}