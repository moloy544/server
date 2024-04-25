import { Router } from "express";
import { addNewActor, updateActor } from "./controller/actress.controller.js";
import { addNewMovie, deleteMovie, updateWatchLinkUrl } from "./controller/movies.controller.js";
import Movies from "../../models/Movies.Model.js";

const router = Router();

/*************** Routes For Movies Controller *******************/

router.post('/login', async (req, res)=>{

    const {user, password} = req.body;

    const LoginUser = "Sanjoy504";
    const loginPassword = "SANJOY504";

    if(user === LoginUser && password === loginPassword){
        return res.status(200).send("Login success");
    }
    else{
        return res.status(400).json({message: "Invalid credentials"});
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

//Route for update actor 
router.put('/movie/update_watchlink', updateWatchLinkUrl);

/*************** Routes For Actress Controller *******************/

//Route for add new actor 
router.post('/actor/add', addNewActor);

//Route for update actor 
router.put('/actor/update:id', updateActor);


export default router;