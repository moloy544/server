import axios from "axios";
import Movies from "../../../models/Movies.Model.js";

export async function updateMovieByOmdbApi(movieData) {
  
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

export { removeDuplicates, updateMovie };
