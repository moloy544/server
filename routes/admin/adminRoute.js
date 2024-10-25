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
        const searchRegex = new RegExp(`https://res.cloudinary.com/moviesbazar/image/upload/`, 'i');
        // Find movies where watchLink array has more than 1 link
        const movie = await Movies.find({
           thambnail: {$regex: searchRegex}
        })
            .select("-_id")  // Added watchLink to response for clarity
            .limit(1)
            .sort({ createdAt: -1 })


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