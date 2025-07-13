import { Router } from "express";
import { addNewActor, getActorData, updateAllActorsAvatar } from "./controller/actors.controller.js";
import { addNewMovie, addNewVideoSource, deleteMovie, updateAllMoviesThumbnails, updateDownloadLinks, updateDynamicVideoPath, updateSeriesSourceBasePath, updateVideoSource, updateVideoSourceIndexPostion } from "./controller/movies.controller.js";
import Movies from "../../models/Movies.Model.js";
import { multerUpload } from "../../utils/multer.js";
import { newAppUpdateRelease } from "./controller/app.controller.js";
import DownloadSource from "../../models/downloadSource.Model.js";
import { updateMoviesIMDBRating } from "./operations/updateMovies.operation.js";
import { AddAndUpdateTrendingMovies } from "./controller/listings.controller.js";
import { AddSeries } from "./controller/series.controller.js";

const router = Router();

/*************** Movies Related Routes Section ***********************/

//Add new movie route
router.post('/movie/add', multerUpload.single('file'), addNewMovie);

//Delete movie route'
router.delete('/movie/delete/:id', deleteMovie);

//Get single movies or series details 
router.get('/movie/get/:imdbId', async (req, res) => {

    try {

        const { imdbId } = req.params;

        if (!imdbId) {
            return res.status(400).json({ message: "imdbId is required" });
        };

        const movieData = await Movies.findOne({ imdbId });

        return res.status(200).json({ movieData });

    } catch (error) {
        console.log(error)
        return res.status(500).json({ message: "Internal Server Error" });
    };

});

// Add New Series Source
router.post('/add/series_episods', AddSeries);

/*************** Actor Related Routes Section ********************************/

//Route for add new actor 
router.post('/actor/add', multerUpload.single('file'), addNewActor);

//Route for add new actor 
router.post('/actor/get', getActorData);

/*************** Admin Controll Other Routes Section ********************************/

//update video source url link route
router.put('/update/videosource', updateVideoSource);

//update series source bashpath
router.put('/update/series/source/bashpath', updateSeriesSourceBasePath);

//update video source url link route
router.put('/update/videosource/dinamic_part', updateDynamicVideoPath);

// Add new video source in existing document watchlink
router.put('/add/new_videosource', addNewVideoSource);

// Update Video Source Index postion in array for specified video source
router.put('/update/VideoSourceIndexPostion', updateVideoSourceIndexPostion);

// update download links route
router.put('/update/downloadlinks', updateDownloadLinks);

// app new update release route
router.post('/release_new_update', newAppUpdateRelease);

router.get('/movies/one_by_one', async (req, res) => {
    try {
        const { skip = 0 } = req.query;

        // Create a single regex pattern for the entire query
        const searchRegex = new RegExp(`res.cloudinary.com`, 'i'); // Match domain and .m3u8 in a single string

        const movie = await Movies.find({
        rpmshareSourceLable: { $exists: true, $ne: null }, // Ensure the field exists and is not null
        })
        .select("-_id")  // Exclude _id from the response
        .limit(1) 
        .skip(skip)       // Limit to 1 result
        .sort({ releaseYear: 1, fullReleaseDate: 1 }); // Sort by releaseYear and fullReleaseDate
        
        if (!movie.length) {
            return res.status(404).json({ message: "No movies found with more than 1 watch link" });
        }

        res.json({ movie: movie[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});


// Add new download links for movies
router.post('/add/downloadlinks', async (req, res) => {
    try {
        const data = req.body;
        const id = data.content_id;

        if (!id) {
            return res.status(400).json({ message: "Content ID is required for link movies to download links" });
        };

        // check download links already exist or not
        const findDownloadLinks = await DownloadSource.findOne({ content_id: id });

        // if download links already exist upadte the download links
        if (findDownloadLinks) {
            const updateDownloadLinks = await DownloadSource.findOneAndUpdate(
                { content_id: id },
                { $set: data },
                { new: true }
            );
            if (!updateDownloadLinks) {
                return res.status(500).json({ message: "Failed to update download links" });
            }

            return res.status(200).json({ message: `Download links already exists with this ${id} content ID and its update with new data`, updateData: updateDownloadLinks });
        }

        const newDownloadLinks = new DownloadSource(data);
        const result = await newDownloadLinks.save();
        if (!result) {
            return res.status(500).json({ message: "Failed to add download links" });
        }
        return res.status(200).json({ message: "Download links added successfully", downloadLinks: result });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
});

// update all actors cloudinary avatar
router.post('/update/actors/cloudinary_avatar', updateAllActorsAvatar);

// update all movies cloudinary thumbnail
router.post('/update/movies/thumbnails', updateAllMoviesThumbnails);

// Update Or Add Updated IMDB Rating
router.put('/update/movies/rating/:imdbId', updateMoviesIMDBRating);

// ************************* (Listings Controller Section Routs) ************************* //

// Add or update trending movies route
router.post('/add_update/trending_content', AddAndUpdateTrendingMovies);

export default router;