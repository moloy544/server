import axios from "axios";
import Movies from "../../../models/Movies.Model.js";

async function removeDuplicates() {
    try {
        const result = await Movies.aggregate([
          {
            $group: {
              _id: '$imdbId',
              count: { $sum: 1 },
              movies: { $push: '$$ROOT' }
            }
          },
          {
            $match: {
              count: { $gt: 1 }
            }
          },
          {
            $unwind: '$movies'
          },
          {
            $replaceRoot: { newRoot: '$movies' }
          },
          {
            $sort: { _id: 1 }
          },
          {
            $group: {
              _id: '$imdbId',
              firstMovie: { $first: '$$ROOT' },
              duplicates: { $push: '$$ROOT' }
            }
          },
          {
            $unwind: '$duplicates'
          },
          {
            $replaceRoot: { newRoot: '$duplicates' }
          }
        ]);
    
        const toDeleteIds = result.map(movie => movie._id);
    
        if (toDeleteIds.length > 0) {
          const deleteResult = await Movies.deleteMany({ _id: { $in: toDeleteIds } });
          console.log(`Deleted ${deleteResult.deletedCount} duplicate records.`);
        } else {
          console.log('No duplicate records found.');
        }
      } catch (error) {
        console.error('Error removing duplicates:', error);
        throw error;
      }
  }

  async function updateMovie(movieData) {
    try {

        if (!movieData) {
            return null;
        }

        const movieImdbId = movieData?.imdbId;

        const omdbResponse = await axios.get(`https://www.omdbapi.com/?&apikey=5422c8e9&plot=full&i=${movieImdbId}`);

        if (omdbResponse.status === 200) {

            const { Released, Actors } = omdbResponse.data;

            const actorsArray = Actors.split(',').map(actor => actor.trim());

            const updateMovie = await Movies.findOneAndUpdate(
                { imdbId: movieImdbId },
                {
                    $set: {
                        fullReleaseDate: Released,
                        castDetails: actorsArray,
                    }
                },
                { new: true })
            console.log(updateMovie)
        }
    } catch (error) {
        console.log(error);
    }
};

export { removeDuplicates, updateMovie};
