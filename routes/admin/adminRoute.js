import { Router } from "express";
import { addNewActor, updateActor } from "./controller/actress.controller.js";
import { addNewMovie, deleteMovie, updateWatchLinkUrl } from "./controller/movies.controller.js";

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