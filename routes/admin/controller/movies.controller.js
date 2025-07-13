import { isValidObjectId } from "mongoose";
import Movies from "../../../models/Movies.Model.js";
import { deleteImageFromCloudinary, uploadOnCloudinary } from "../../../utils/cloudinary.js";
import { bufferToDataUri } from "../../../utils/index.js";
import DownloadSource from "../../../models/downloadSource.Model.js";
import SeriesEpisode from "../../../models/Series.Model.js";

//add movie controller
export async function addNewMovie(req, res) {
    try {

        const { data, createdDateUpdate } = req.body;

        const file = req.file;

        const parseData = data ? JSON.parse(data) : {};

        // get movie imdb id
        const { imdbId, extranalImage_uri } = parseData;

        // Check if the movie is available
        const findMovie = await Movies.findOne({ imdbId });

        // creat a new data object for store in database
        const newData = parseData;

        // check if movie already exist so update 
        if (findMovie) {

            // If new file is provided the upload new file in cloudinary
            if (file) {

                const fileUri = bufferToDataUri(file);

                // Upload new thumbnail to Secomd Cloudinary Account
                const uploadCloudinary = await uploadOnCloudinary({
                    image: fileUri,
                    publicId: findMovie._id,
                    folderPath: "movies/thumbnails"
                });

                if (!uploadCloudinary.secure_url) {
                    return res.status(500).json({ message: "Error while update thumbnail" });
                };

                // Update movieData with new thumbnail URL
                newData.thumbnail = uploadCloudinary.secure_url
            } else if (extranalImage_uri && extranalImage_uri !== findMovie.thumbnail) {
                //const isCloudinaryImage = findMovie.thumbnail.includes('res.cloudinary.com');
                /**if (isCloudinaryImage) {
                    newData.updateNeedAfter= true
                };**/
                newData.thumbnail = extranalImage_uri;
            };

            if (createdDateUpdate && createdDateUpdate === "yes") {
                newData.createdAt = Date.now();
            }
            // Update the existing movie with the new data
            const updateMovie = await Movies.findOneAndUpdate(
                { imdbId },
                { $set: newData },
                { new: true }
            );

            return res.status(200).json({ message: "Movie has been updated with new data", movieData: updateMovie });
        };

        // creat a new movie document in mongodb
        const movie = new Movies({
            ...newData,
            createdAt: Date.now()
        });

        if (file) {

            const fileUri = bufferToDataUri(file);

            // if movie is successfully saved then upload file in cloudinary
            const uploadCloudinary = await uploadOnCloudinary({
                image: fileUri,
                publicId: movie._id,
                folderPath: "movies/thumbnails"
            });

            // check upload fail in cloudinary then send error message
            if (!uploadCloudinary.secure_url) {
                return res.status(500).json({ message: "Error while uploading thumbnail" });
            };

            // add thumbnail to mongoose Model object
            movie.thumbnail = uploadCloudinary.secure_url;
        } else if (extranalImage_uri) {
            movie.thumbnail = extranalImage_uri
        } else {
            return res.status(400).json({ message: "Please provide a movie thumbnail" });
        }

        // save the document in mongodb
        const saveMovie = await movie.save();

        // check if movie is save or not if not send then send error message and delete thumbnail from cloudinary
        if (!saveMovie && file) {
            deleteImageFromCloudinary({
                id: movie.id,
                imageLink: movie.thumbnail
            })
            return res.status(500).json({ message: "Error while adding movie to the database" });
        };

        return res.status(200).json({ message: "Movie added successfully", movieData: saveMovie });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Internal server error while add document' });
    };
};

//delete movie controller
export async function deleteMovie(req, res) {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).send({ message: "Invalid request. Missing id." });
        } else if (!isValidObjectId(id)) {
            return res.status(400).send({ message: "Invalid request. Invalid id format." });
        }

        // Fetch the movie to get the image link
        const movie = await Movies.findOne({ _id: id, });

        if (!movie) {
            return res.status(404).send({ message: "Movie not found" });
        }

        const imageLink = movie.thumbnail; // Assuming imageLink is stored in the movie document

        const deleteMovie = await Movies.deleteOne({ _id: id });

        if (deleteMovie.deletedCount > 0) {

            //Delete movie image from cloudinary server
            await deleteImageFromCloudinary({ imageLink, id: id });

            return res.status(200).send({ message: "Movie deleted successfully" });
        } else {
            return res.status(400).send({ message: "Failed to delete movie or movie not found" });
        }
    } catch (error) {
        console.error("Error:", error);
        return res.status(500).send({ message: "Internal server error while deleting movie" });
    }
};

export async function makeDocumentsStringToArray(field) {

    try {

        // Update the documents
        await Movies.updateMany(
            { [field]: { $type: 'string' } },
            [
                {
                    $set: {
                        [field]: { $cond: { if: { $isArray: `$${field}` }, then: `$${field}`, else: [`$${field}`] } }
                    }
                }
            ]
        );

        console.log(`Field "${field}" updated successfully.`);
    } catch (error) {
        console.error(`Error updating field "${field}":`, error);
    };

}

// Function controller for update hls video source
export async function updateVideoSource(req, res) {

    try {
        const { domainToFind, newDomain, batchLimit } = req.body;

        if (!domainToFind || !newDomain) {
            return res.status(400).json({ message: 'Missing required fields: domainToFind, newDomain' });
        }
        // Find all documents that have watchLink matching the specified pattern
        const movies = await Movies.find({
            watchLink: { $elemMatch: { $regex: `${domainToFind}` } },
        }).limit(batchLimit).select('_id watchLink');

        if (!movies || movies.length === 0) {
            return res.status(404).json({ message: 'No movies found matching the specified pattern.' });
        };

        // Create an array of promises for updating each document
        const updatePromises = movies.map(async (doc) => {
            // Update each watchLink that matches the specified pattern
            const updatedWatchLink = doc.watchLink.map(link => {
                if (link.includes(`${domainToFind}`)) {
                    return link.replace(`${domainToFind}`, `${newDomain}`);
                }
                return link;
            });

            // Update the document with the modified watchLink array
            await Movies.updateOne(
                { _id: doc._id },
                { $set: { watchLink: updatedWatchLink } }
            );
        });

        // Wait for all update operations to complete
        await Promise.all(updatePromises);

        return res.status(200).json({ message: 'Video Source updated successfully.' });

    } catch (error) {
        console.error('Error while updating Video Source', error);
        return res.status(500).json({ message: 'Internal server error while updating Video Source' });
    }
};


// Function controller for add new Source in WatchLinks
export async function addNewVideoSource(req, res) {
    try {
        const { domainToFind, newDomain, batchLimit } = req.body;

        if (!domainToFind || !newDomain) {
            return res.status(400).json({ message: 'Missing required fields: domainToFind, newDomain' });
        }

        // Find all documents that contain domainToFind but do not have the newDomain
        // Find all documents where watchLink contains domainToFind and does not contain newDomain
        const movies = await Movies.find({
            watchLink: {
                $elemMatch: { $regex: domainToFind },  // watchLink contains domainToFind
                $not: { $elemMatch: { $regex: newDomain } } // watchLink does not contain newDomain
            },
        })
            .limit(batchLimit) // Set a limit based on the batchLimit
            .select('_id watchLink imdbId'); // Select relevant fields

        if (!movies || movies.length === 0) {
            return res.status(404).json({ message: 'No movies found matching the specified pattern.' });
        }

        // Create an array of promises for updating each document
        const updatePromises = movies.map(async (doc) => {
            const newUrl = `${newDomain}${doc.imdbId}`;

            // Concatenate the new URL and imdbId and add it to the watchLink array
            const updatedWatchLink = [...doc.watchLink, newUrl];

            // Update the document with the modified watchLink array
            return Movies.updateOne(
                { _id: doc._id },
                { $set: { watchLink: updatedWatchLink } }
            );
        });

        // Wait for all update operations to complete
        await Promise.all(updatePromises);

        return res.status(200).json({ message: 'Video Source updated successfully.' });
    } catch (error) {
        console.error('Error while updating Video Source', error);
        return res.status(500).json({ message: 'Internal server error while updating Video Source' });
    }
};

// Update Serie Episodes Source 
export async function updateSeriesSourceBasePath(req, res) {
    try {
        const { domainToFind, newDomain, batchLimit = 500 } = req.body;

        if (!domainToFind || !newDomain) {
            return res.status(400).json({ message: "Missing required fields: domainToFind, newDomain" });
        }

        const seriesDocs = await SeriesEpisode.find({
            "data.seasons.basePath": { $regex: `^${domainToFind}` },
        })
            .limit(batchLimit)
            .select("_id data imdbId title");

        if (!seriesDocs || seriesDocs.length === 0) {
            return res.status(404).json({ message: "No matching basePath found in series data." });
        }

        const updatePromises = seriesDocs.map(async (doc) => {
            const updatedData = doc.data.map((langBlock) => {
                const updatedSeasons = langBlock.seasons.map((season) => {
                    let updatedBasePath = season.basePath;

                    if (season.basePath.startsWith(domainToFind)) {
                        updatedBasePath = season.basePath.replace(domainToFind, newDomain);
                    }

                    return {
                        ...season,
                        basePath: updatedBasePath,
                    };
                });

                return {
                    ...langBlock,
                    seasons: updatedSeasons,
                };
            });

            return SeriesEpisode.updateOne(
                { _id: doc._id },
                { $set: { data: updatedData } }
            );
        });

        await Promise.all(updatePromises);

        return res.status(200).json({ message: "Series basePaths updated successfully." });
    } catch (error) {
        console.error("Error updating basePaths:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
}


// Controller to update dynamic part of video source URLs
export async function updateDynamicVideoPath(req, res) {
    try {
        const { baseSourceToMatch, newDynamicPath, batchLimit } = req.body;

        if (!baseSourceToMatch || !newDynamicPath) {
            return res.status(400).json({
                message: 'Missing required fields: baseSourceToMatch, newDynamicPath'
            });
        }

        const escapedBase = baseSourceToMatch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const escapedNewPath = newDynamicPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        // Regex to find: base path + dynamic segment (not the new one)
        const matchRegex = `${escapedBase}\\/[^\\/]+\\/`;
        const excludeRegex = `${escapedBase}${escapedNewPath}`;

        // Find only if it matches the base+any path but NOT already updated to new
        const movies = await Movies.find({
            watchLink: {
                $elemMatch: {
                    $regex: matchRegex,
                    $not: { $regex: excludeRegex }
                }
            }
        })
        .limit(batchLimit)
        .select('_id watchLink');

        if (!movies || movies.length === 0) {
            return res.status(200).json({ message: 'No more dynamic video sources available for update.' });
        }

        let processedCount = 0;

        const updatePromises = movies.map(async (doc) => {
            let updated = false;

            const updatedLinks = doc.watchLink.map(link => {
                const pattern = new RegExp(`(${escapedBase}\\/)[^\\/]+(\\/.*)`);
                if (pattern.test(link) && !link.includes(newDynamicPath)) {
                    updated = true;
                    return link.replace(pattern, `$1${newDynamicPath.replace(/\//g, '')}$2`);
                }
                return link;
            });

            if (updated) {
                processedCount++;
                return Movies.updateOne(
                    { _id: doc._id },
                    { $set: { watchLink: updatedLinks } }
                );
            }
        });

        await Promise.all(updatePromises);

        return res.status(200).json({
            message: `Video source dynamic path updated successfully.`,
            updated: processedCount,
            batchLimit: batchLimit
        });

    } catch (error) {
        console.error('Error while updating dynamic path in video source:', error);
        return res.status(500).json({ message: 'Internal server error while updating video source' });
    }
};


// Function controller for updating HLS video source and moving it to a specified index
export async function updateVideoSourceIndexPostion(req, res) {
    try {
        const { domainToFind, preferredIndex, batchLimit, content_type } = req.body;

        if (!domainToFind || preferredIndex === undefined) {
            return res.status(400).json({ message: 'Missing required fields: domainToFind, preferredIndex' });
        };

        const initialQuery = {
            watchLink: { $elemMatch: { $regex: domainToFind } }
        };

        if (content_type) {
            initialQuery.type = content_type;
        }

        // Find all documents that have watchLink matching the specified pattern
        const movies = await Movies.find(initialQuery)
            .limit(batchLimit)
            .select('_id watchLink');

        if (!movies || movies.length === 0) {
            return res.status(404).json({ message: 'No movies found matching the specified pattern.' });
        }

        // Create an array of promises for updating each document
        const updatePromises = movies.map(async (doc) => {
            // Find the index of the domainToFind in the watchLink array
            const currentIndex = doc.watchLink.findIndex((link) => link.includes(`${domainToFind}`));

            // If domainToFind is not in the array, skip the update
            if (currentIndex === -1) {
                return;
            }

            // Check if the preferredIndex is greater than the length of the watchLink array
            if (preferredIndex >= doc.watchLink.length) {
                return res.status(400).json({
                    message: `Invalid preferredIndex. The preferred index ${preferredIndex} is out of bounds for the array length of ${doc.watchLink.length}.`,
                });
            }

            // Remove the domain from its current index
            const updatedWatchLink = [...doc.watchLink];
            const [domain] = updatedWatchLink.splice(currentIndex, 1); // Remove the domainToFind

            // Insert the domainToFind at the new preferredIndex
            updatedWatchLink.splice(preferredIndex, 0, domain);

            // Update the document with the modified watchLink array
            await Movies.updateOne(
                { _id: doc._id },
                { $set: { watchLink: updatedWatchLink } }
            );
        });

        // Wait for all update operations to complete
        await Promise.all(updatePromises);

        return res.status(200).json({ message: 'Video Source moved and updated successfully.' });
    } catch (error) {
        console.error('Error while updating and moving Video Source', error);
        return res.status(500).json({ message: 'Internal server error while updating Video Source' });
    }
}


// Function controller for update download links
export async function updateDownloadLinks(req, res) {

    try {
        const { valueToFind, newValue, batchLimit } = req.body;

        if (!valueToFind || !newValue) {
            return res.status(400).json({ message: 'Missing required fields: valueToFind, newValue' });
        }

        // Find all documents that have links and in links have urls matching the specified pattern
        const downloadLinks = await DownloadSource.find({
            'links.url': { $regex: valueToFind }
        }).limit(batchLimit);

        if (!downloadLinks || downloadLinks.length === 0) {
            return res.status(404).json({ message: 'No Download links found matching the specified pattern.' });
        }

        // Create an array of promises for updating each document
        const updatePromises = downloadLinks.map(async (doc) => {
            // Update each `links.url` that matches the specified pattern
            const updatedLinks = doc.links.map(link => {
                if (link.url?.includes(valueToFind)) {
                    // Update the `url` field in the link object
                    return {
                        ...link, // Keep other fields (quality, size) unchanged
                        url: link.url.replace(valueToFind, newValue)
                    };
                }
                return link; // If no match, return the link unchanged
            });

            // Update the document with the modified links array
            await DownloadSource.updateOne(
                { _id: doc._id },
                { $set: { links: updatedLinks } }
            );
        });

        // Wait for all update operations to complete
        await Promise.all(updatePromises);

        return res.status(200).json({ message: 'Download links updated successfully.' });

    } catch (error) {
        console.error('Error while updating Download links', error);
        return res.status(500).json({ message: 'Internal server error while updating Download links' });
    }
};

// Controller function to update 20 movies thumbnails at a time and track success
export async function updateAllMoviesThumbnails(req, res) {
    try {
        const { cloudName, batchLimit = 20 } = req.body;

        // Check if cloudinary cloud name is provided
        if (!cloudName) {
            return res.status(400).json({ message: "Cloudinary cloud name is required" });
        };

        // Create a regex pattern for matching Cloudinary URLs
        const searchRegex = new RegExp(`https://res.cloudinary.com/${cloudName}/image/upload/`, 'i');

        // Query 20 movies with thumbnails that match the regex, one batch per request
        const movies = await Movies.find({
            thumbnail: { $regex: searchRegex }
        })
            .select("thumbnail")  // Only select the thumbnail field
            .limit(batchLimit)  // Fetch only batchLimit images
            .lean();  // Return plain JS objects

        if (!movies || movies.length === 0) {
            return res.status(404).json({ message: "No movies found for update." });
        }

        let successCount = 0;  // Counter for successfully updated actors

        // Process each actors thumbnail
        const uploadPromises = movies.map(async (movie) => {
            try {
                const oldThumbnail = movie.thumbnail;

                // Upload the old thumbnail to the new Cloudinary account
                const uploadResponse = await uploadOnCloudinary({
                    image: oldThumbnail,
                    publicId: movie._id,  // Use actor ID as public ID in Cloudinary
                    folderPath: "movies/thumbnails"  // Destination folder in the new Cloudinary account
                });

                // Only update if the Cloudinary upload was successful (i.e., secure_url is returned)
                if (uploadResponse && uploadResponse.secure_url) {
                    const newThumbnailUrl = uploadResponse.secure_url;

                    // First, update the movie record in MongoDB
                    const updateResult = await Movies.updateOne(
                        { _id: movie._id },
                        { $set: { thumbnail: newThumbnailUrl } }
                    );

                    // Check if the MongoDB update was successful before adding the delete task to the queue
                    if (updateResult.modifiedCount > 0) {
                        successCount++;  // Increment success count for each successful update
                    } else {
                        // MongoDB update failed, do not delete the old image
                        console.error(`Failed to update MongoDB for movie ${movie._id}, skipping Cloudinary deletion.`);
                    }

                } else {
                    console.error(`No secure_url returned for movie ${movie._id}. Skipping update.`);
                }
            } catch (uploadError) {
                console.error(`Failed to upload avatar for movie ${movie._id}:`, uploadError);
            }
        });

        // Wait for all uploads to complete
        await Promise.all(uploadPromises);

        console.log(`Batch of ${batchLimit} processed. ${successCount} movie thumbnail updated successfully.`);
        return res.status(200).json({
            message: `Batch of ${batchLimit} processed. ${successCount} movie thumbnail updated successfully.`
        });

    } catch (error) {
        console.error('Error during the update process:', error);
        return res.status(500).json({ message: 'Internal server error during the update process.' });
    }
}
