import { Router } from "express";
import { addNewActor, getActorData } from "./controller/actors.controller.js";
import { addNewMovie, deleteMovie, updateVideoSource } from "./controller/movies.controller.js";
import Movies from "../../models/Movies.Model.js";
import { multerUpload } from "../../utils/multer.js";
import { newAppUpdateRelease } from "./controller/app.controller.js";
import DownloadLinks from "../../models/DownloadLinks.Model.js";

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


/*************** Actor Related Routes Section ********************************/

//Route for add new actor 
router.post('/actor/add', multerUpload.single('file'), addNewActor);

//Route for add new actor 
router.post('/actor/get', getActorData);

/*************** Admin Controll Other Routes Section ********************************/

//update video source url link route
router.put('/update/videosource', updateVideoSource);

// app new update release route
router.post('/release_new_update', newAppUpdateRelease);

router.get('/movies/one_by_one', async (req, res) => {
    try {

        // Create a single regex pattern for the entire query
        const searchRegex = new RegExp(`https://res.cloudinary.com/dxhafwrgs/image/upload/`, 'i');
        const movie = await Movies.find({
            $expr: { $eq: [{ $size: "$watchLink" }, 1] },
             thambnail: {$regex: searchRegex},
            type: 'movie',
            category: 'bollywood',
            videoType: {$exists: false},
        })        
            .select("-_id")  // Added watchLink to response for clarity
            .limit(1)
            .sort({ releaseYear: -1, fullReleaseDate: -1 })


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
        const findDownloadLinks = await DownloadLinks.findOne({ content_id: id });

        // if download links already exist upadte the download links
        if (findDownloadLinks) {
            const updateDownloadLinks = await DownloadLinks.findOneAndUpdate(
                { content_id: id },
                { $set: data },
                { new: true }
            );
            if (!updateDownloadLinks) {
                return res.status(500).json({ message: "Failed to update download links" });
            }

            return res.status(200).json({ message: `Download links already exists with this ${id} content ID and its update with new data`, updateData: updateDownloadLinks });
        }

        const newDownloadLinks = new DownloadLinks(data);
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


export default router;