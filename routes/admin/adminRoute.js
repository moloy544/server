import { Router } from "express";
import { addNewActor, getActorData } from "./controller/actors.controller.js";
import { addNewMovie, deleteMovie, updateVideoSource } from "./controller/movies.controller.js";
import Movies from "../../models/Movies.Model.js";
import { multerUpload } from "../../utils/multer.js";

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

//update server status
router.put('/server/status', async (req, res) => {
    try {
        const { serverStatus, watchLink } = req.body;


        if (!serverStatus || !watchLink) {
            return res.status(400).json({ message: "Status and watchLink are required" });
        }

        // Create a case-insensitive regex for the watchLink
        const regexValue = new RegExp(watchLink, 'i');

        // Perform the bulk update
        const updateData = await Movies.updateMany(
            { watchLink: { $regex: regexValue } },
            { $set: { server: serverStatus } }
        );

       
        return res.status(200).json({
            message: `Movies updated successfully. modifiedCount: ${updateData.modifiedCount} and matchedCount: ${updateData.matchedCount}`,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
});

export default router;