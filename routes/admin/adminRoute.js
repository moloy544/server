import { Router } from "express";
import { addNewActor, getActorData } from "./controller/actors.controller.js";
import { addNewMovie, deleteMovie, updateVideoSource } from "./controller/movies.controller.js";
import Movies from "../../models/Movies.Model.js";
import { multerUpload } from "../../utils/multer.js";
import { newAppUpdateRelease } from "./controller/app.controller.js";

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

        // Find movies where watchLink array has more than 1 link
        const movie = await Movies.find({
            $expr: { $gt: [{ $size: "$watchLink" }, 1] },  // watchLink array length > 1
            type: 'movie',
            language: 'hindi dubbed',
            multiAudio: { $exists: false },  // multiAudio field does not exist
            videoType: { $exists: false },   // videoType field does not exist
        })
            .select("-_id")  // Added watchLink to response for clarity
            .limit(1)

        if (!movie.length) {
            return res.status(404).json({ message: "No movies found with more than 1 watch link" });
        }

        res.json({ movie: movie[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});


//update server status
router.put('/update/movies/audio_and_video_type', async (req, res) => {
    try {
        const { imdbId,
            multiAudio,
            videoType } = req.body;

        if (!imdbId) {
            return res.status(400).json({ message: "IMDb ID is required to update movie details" });
        }

        // Check if the movie with the provided imdbId exists and update it
        const updateMovie = await Movies.findOneAndUpdate(
            { imdbId },
            { $set: { multiAudio, videoType} },
            { new: true }
        );

        // If no movie is found or updated, return an error
        if (!updateMovie) {
            return res.status(404).json({ message: `Movie with IMDb ID: ${imdbId} not found` });
        }

        return res.status(200).json({
            message: `Movie with IMDb ID: ${imdbId} updated successfully`,
            updatedMovie: updateMovie,  // Returning the updated movie details
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
});


export default router;