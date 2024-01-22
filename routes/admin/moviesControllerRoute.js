import { Router } from "express";
import Movies from '../../models/Movies.Model.js';
import Actress from "../../models/Actress.Model.js";
import { uploadOnCloudinary } from "../../utils/cloudinary.js";
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import moment from 'moment';
import path from 'path';

// Convert file URL to file path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

/****************** Movies Admin Panel Add Movies Route *****************/

//Route for add new movie
router.post('/add_movie', async (req, res) => {

    try {

        const { data } = req.body;

        const movieData = {
            ...data,
        };

        const imdbId = data.imdbId;
        const thambnail = data.thambnail

        //Check movie is available or not 
        const isMovieAvailable = await Movies.findOne({ imdbId: imdbId });

        //if movie is available so update with new data only
        if (isMovieAvailable) {

            const updateMovie = await Movies.findOneAndUpdate(

                { imdbId: imdbId },

                movieData,

                { new: true }
            );

            return res.status(200).json({ message: "Movie has been update with new data", movieData: updateMovie });
        };

        const movie = new Movies(movieData);

        const saveMovie = await movie.save();

        if (saveMovie) {

            const uploadCloudinary = await uploadOnCloudinary({
                image: thambnail,
                imageId: saveMovie._id,
                folderPath: "moviesbazaar/thambnails"
            });

            if (!uploadCloudinary) {
                return res.status(500).json({ message: "Error while upload on cloudinary" });
            };

            saveMovie.thambnail = uploadCloudinary.secure_url || saveMovie.thambnail;

            return res.status(200).json({ message: "Movie Added Successfull", movieData: saveMovie, uploadCloudinary });

        } else {

            return res.status(500).json({ message: "Error while add movie in to database" });

        };

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

//Delete movie route'
router.delete('/delete/:id', async (req, res) => {
    try {

        const { id } = req.params;

        if (!id) {
            return res.status(400).send({ message: "Invalid request. Missing id." });
        };

        const deleteMovie = await Movies.findByIdAndDelete(id);

        if (deleteMovie) {

            //Delete movie image from cloudinary server
            await deleteImageFromCloudinary({ publicId: id });

            return res.status(200).send({ message: "Movie delete successfully" });

        } else {
            return res.status(400).send({ message: "Fail to delete movie" });
        }
    } catch (error) {
        console.log(error)
    }
});

//update movie watchLink route'
router.put('/update-watchlink/:imdbId', async (req, res) => {

    try {
        const { imdbId } = req.params;

        const { watchLink } = req.body;

        if (!imdbId || !watchLink) {
            return res.status(400).send({ message: "Invalid request. Missing imdbId or watchLink." });
        };

        const findAndUpdate = await Movies.findOneAndUpdate(
            { imdbId },
            {
                $set: {
                    watchLink
                }
            },
            { new: true }
        );
        if (findAndUpdate) {

            return res.status(200).send({ message: "Movie watchlink update successfully", updateData: findAndUpdate });

        } else {
            return res.status(400).send({ message: "Fail to update movie watch link" });
        }
    } catch (error) {
        console.error("Error updating watchlink:", error);
        return res.status(500).send({ message: "Internal server error" });
    }
});


//Route for add new actor 
router.post('/add_actor', async (req, res) => {

    try {

        const { actorData } = req.body;

        const { avatar, name, industry } = actorData || {};

        const isActorAvailable = await Actress.findOne({ name, industry });

        if (isActorAvailable) {

            return res.status(300).json({ message: `Actor already exist in ${industry} with name ${name}`, });
        };

        const actor = new Actress(actorData);

        const saveActor = await actor.save();

        if (saveActor) {

            const uploadCloudinary = await uploadOnCloudinary({
                image: avatar,
                imageId: saveActor._id,
                folderPath: "moviesbazaar/actress_avatar"
            });

            if (!uploadCloudinary) {
                return res.status(300).json({ message: "Error while upload on cloudinary" });
            };

            saveActor.avatar = uploadCloudinary.secure_url || avatar;

            return res.status(200).json({ message: "Actor Added Successfull", actorData: saveActor });

        } else {
            return res.status(500).json({ message: " Error while add  actor in to database" });

        };

    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.post('/bulkUpdate', async (req, res) => {

    try {
        // Get the absolute path to the 'movies.json' file
        const jsonFilePath = path.join(__dirname, 'movies.json');

        // Read JSON data from the backup file
        const jsonData = await fs.readFile(jsonFilePath, 'utf8');
        const data = await JSON.parse(jsonData);

        // Convert 'fullReleaseDate' strings to Date objects for all documents
        const updatedData = data.map(item => ({
            ...item,
            fullReleaseDate: new Date(item.fullReleaseDate),
        }));

        // Bulk update all documents in the collection
        const bulkWrite = await Movies.bulkWrite(
            updatedData
                .filter(item => item.fullReleaseDate) // Filter out documents without fullReleaseDate
                .map(item => {
                    const { _id, ...restOfItem } = item;

                    // Parse the date and check if it's a valid date
                    const parsedDate = moment(item.fullReleaseDate, ['YYYY-MM-DD', 'DD MMM YYYY', 'DD MMMM YYYY'], true);

                    if (parsedDate.isValid()) {
                        // If the parsed date is valid, update the document with a formatted date string
                        const formattedDate = parsedDate.format('DD MMM YYYY');
                        return {
                            updateOne: {
                                filter: {
                                    imdbId: restOfItem.imdbId
                                },
                                update: {
                                    $set: { ...restOfItem, fullReleaseDate: formattedDate },
                                },
                                upsert: true,
                            },
                        };
                    } else {
                        console.log(`Warning: Invalid date for document with imdbId ${restOfItem.imdbId}.`);
                        return null; // Skip this document if the date is invalid
                    }
                })
                .filter(Boolean) // Filter out null values (documents with invalid dates)
        );


        // Check if any documents were updated
        if (bulkWrite.modifiedCount > 0 || bulkWrite.upsertedCount > 0) {
            console.log('Some documents updated successfully.');
            return res.status(200).json({ message: 'Some documents updated successfully.' });
        } else {
            console.log('No documents updated.');
            return res.status(400).json({ message: 'No documents updated.' });
        }

    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
})

export default router;