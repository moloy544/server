import { TrendingContnet } from "../../../models/Listings.Modal.js";
import Movies from "../../../models/Movies.Model.js";

// Add or update trending movies controller
export async function AddAndUpdateTrendingMovies(req, res) {
    try {
        const { contentId } = req.body;

        const imdbId = contentId.startsWith("tt") ? contentId : "tt"+ contentId// Check if contentId is an IMDB ID

        const findMovie = await Movies.findOne({ imdbId: imdbId }).lean().exec(); // Use lean() for better performance
        if (!findMovie) {
            return res.status(400).json({ message: "Invalid content id" });
        }

        const id = findMovie._id; // Get the ObjectId from the movie document

        // Check if the movie already exists in the Trending Content collection
        const findItem = await TrendingContnet.findOne({ content_id: id }).lean().exec(); // Use lean() for better performance

        // If the item exists, update it
        if (findItem) {
            const updateItem = await TrendingContnet.findOneAndUpdate(
                { content_id: id },
                { $set: { updatedAt: Date.now() } },  // Update timestamp
                { new: true }  // Return the updated document
            );

            return res.status(200).json({
                message: "Content has been updated with new data",
                contentData: updateItem
            });
        }

        // If the item does not exist, create a new document
        const newItem = new TrendingContnet({
            content_id: id,
            createdAt: Date.now(),   // Set the creation date
            updatedAt: Date.now()    // Set the updated date
        });

        // Save the new document
        const saveItem = await newItem.save();

        if (!saveItem) {
            return res.status(500).json({ message: "Error while adding content to the Trending Content collection" });
        }

        return res.status(200).json({
            message: "Content added successfully to Trending Content collection",
            movieData: saveItem
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error while adding document' });
    }
}
