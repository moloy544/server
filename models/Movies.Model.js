import { Schema, model } from "mongoose";

const moviesModel = new Schema({
  imdbId: {
    type: String,
    required: true,
  },
  imdbRating: {
    type: Number,
  },
  thambnail: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  releaseYear: {
    type: Number,
    required: true,
  },
  fullReleaseDate: {
    type: Date,
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    required: true,
  },
  language: {
    type: String,
    required: true,
  },
  genre: {
    type: [String],
    required: true,
  },
  watchLink: {
    type: [String],
  },
  castDetails: {
    type: [String],
    required: true,
  },
  status: {
    type: String,
    required: true,
  },
  tags: {
    type: [String],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Movies = model('Movies', moviesModel);

export default Movies;