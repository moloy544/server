import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import Movies from './models/Movies.Model.js';

// IMDb ID validation using regex pattern
const imdbIdPattern = /^tt\d{7,}$/;

// Function to add a timeout to the fetch request
const fetchWithTimeout = (url, options = {}, timeout = 10000) => {
  return Promise.race([
    fetch(url, options),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out')), timeout))
  ]);
};

// Helper function to introduce a delay (in milliseconds)
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Function to update the IMDb rating of a single movie
const updateSingleMovieRating = async (movie) => {
  try {
    const imdbId = movie.imdbId;

    if (!imdbId || !imdbIdPattern.test(imdbId.trim())) {
      console.log(`Invalid IMDb ID for movie: ${movie.title}`);
      return { success: false, message: 'Invalid IMDb ID' };
    }

    // Fetch the IMDb page with a timeout
    const response = await fetchWithTimeout(`https://www.imdb.com/title/${imdbId}`);
    if (!response.ok) {
      console.log(`Failed to fetch IMDb rating for ${movie.title}`);
      return { success: false, message: 'Failed to fetch' };
    }

    const htmlContent = await response.text();
    const $ = cheerio.load(htmlContent);

    // Find and extract the IMDb rating
    const ratingDiv = $('div[data-testid="hero-rating-bar__aggregate-rating__score"]');
    const ratingText = ratingDiv.find('span').first().text();

    if (!ratingText) {
      console.log(`No IMDb rating found for ${movie.title}`);
      return { success: false, message: 'No rating found' };
    }

    const imdbRating = parseFloat(ratingText);
    if (isNaN(imdbRating) || imdbRating < 0 || imdbRating > 10) {
      console.log(`Invalid IMDb rating format for ${movie.title}`);
      return { success: false, message: 'Invalid rating format' };
    }

    // Backup the current IMDb rating and update the movie
    const previousRating = movie.imdbRating;
    await Movies.updateOne(
      { imdbId },
      { $set: { imdbRating } }
    );

    console.log(`Updated IMDb rating for ${movie.title}. New rating: ${imdbRating}, Previous rating: ${previousRating}`);
    return { success: true };
  } catch (error) {
    console.error(`Error updating movie: ${movie.title}, Error: ${error.message}`);
    return { success: false, message: error.message };
  }
};

// Function to loop through all movies and update their IMDb ratings
export const updateAllMoviesIMDBRatings = async () => {
  try {
    const allMovies = await Movies.find({}).select('imdbId').lean(); // Fetch all movies from the database

    let updatedCount = 0;
    let failedCount = 0;
    let unchangedCount = 0;

    for (const movie of allMovies) {
      console.log(`Updating IMDb rating for ${movie.title}...`);
      const result = await updateSingleMovieRating(movie);

      if (result.success) {
        updatedCount++;
      } else if (result.message === 'No rating found' || result.message === 'Invalid IMDb ID') {
        unchangedCount++;
      } else {
        failedCount++;
      }

      // Add a delay between each request (1-2 seconds)
      await delay(2000); // 2000 milliseconds = 2 seconds
    }

    console.log(`Update completed. Movies updated: ${updatedCount}, Failed: ${failedCount}, Unchanged: ${unchangedCount}`);
  } catch (error) {
    console.error(`Error updating movies: ${error.message}`);
  }
};

// Call the function to start the update process
updateAllMoviesIMDBRatings();
