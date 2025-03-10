import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import Movies from "../../../models/Movies.Model.js";

// IMDb ID validation using regex pattern
const imdbIdPattern = /^tt\d{7,}$/;

// Function to add a timeout to the fetch request
const fetchWithTimeout = (url, options = {}, timeout = 10000) => {
  return Promise.race([
    fetch(url, options),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out')), timeout))
  ]);
};

//***** Update or Add IMDb Rating to Movies Details *****//
export async function updateMoviesIMDBRating(imdbId) {
  try {
    if (!imdbId || !imdbIdPattern.test(imdbId.trim())) {
      throw new Error("IMDb ID is invalid");
    }

    // Check if the movie is available
    const findMovie = await Movies.findOne({ imdbId });
    if (!findMovie) {
      console.log(`No content found with IMDb ID: ${imdbId}`);
      return;
    }

    // Fetch the IMDb page with a timeout
    const response = await fetchWithTimeout(`https://www.imdb.com/title/${imdbId}`);
    if (!response.ok) {
      console.log("Failed to fetch IMDb rating");
      return;
    }

    const htmlContent = await response.text();

    // Load HTML into Cheerio
    const $ = cheerio.load(htmlContent);

    // Find the div with data-testid "hero-rating-bar__aggregate-rating__score"
    const ratingDiv = $('div[data-testid="hero-rating-bar__aggregate-rating__score"]');

    // Extract the rating from the first <span> element
    const ratingText = ratingDiv.find('span').first().text();
    if (!ratingText) {
      console.log('No IMDb rating found for the movie');
      return;
    }

    const imdbRating = parseFloat(ratingText);
    if (isNaN(imdbRating) || imdbRating < 0 || imdbRating > 10) {
      console.log('Invalid IMDb rating format');
      return;
    }

    // Backup the current IMDb rating before updating
    const previousRating = findMovie.imdbRating;

    // Update the movie with the new IMDb rating
    const updateResult = await Movies.updateOne(
      { imdbId },
      { $set: { imdbRating } }
    );

    if (updateResult.modifiedCount > 0) {
      console.log(`IMDb rating updated successfully for ${imdbId}. New rating: ${imdbRating}, Previous rating: ${previousRating}`);
    } else {
      console.log('No changes made to the movie rating');
    }

  } catch (error) {
    console.error(error.message);
    console.log('Internal server error while updating IMDb rating');
  }
}
