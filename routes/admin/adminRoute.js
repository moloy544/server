import { Router } from "express";
import { addNewActor, updateActor } from "./controller/actress.controller.js";
import { addNewMovie, deleteMovie, updateVideoSource } from "./controller/movies.controller.js";
import Movies from "../../models/Movies.Model.js";

const router = Router();

//Admin login route
router.post('/login', async (req, res) => {

    const { user, password } = req.body;

    const LoginUser = "Sanjoy504";
    const loginPassword = "SANJOY504";

    if (user === LoginUser && password === loginPassword) {
        return res.status(200).send("Login success");
    }
    else {
        return res.status(400).json({ message: "Invalid credentials" });
    };
});

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

//Add new movie route
router.post('/movie/add', addNewMovie);

//Delete movie route'
router.delete('/movie/delete/:id', deleteMovie);

//Route for add new actor 
router.post('/actor/add', addNewActor);

//Route for update actor 
router.put('/actor/update:id', updateActor);

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

router.put('/update/videosource', updateVideoSource);


export default router;