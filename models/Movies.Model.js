import { Schema, model } from "mongoose";

// movies model schema
const moviesModel = new Schema(
  {
    imdbId: { type: String, required: true, unique: true },
    imdbRating: { type: Number, default: 0 },
    thumbnail: { type: String, required: true },
    title: { type: String, required: true },
    dispayTitle: { type: String, required: false },
    releaseYear: { type: Number, required: true },
    fullReleaseDate: { type: Date, required: true },
    category: { type: String, required: true },
    type: { type: String, required: true },
    language: { type: String, required: true },
    genre: { type: [String], required: true },
    watchLink: { type: [String] },
    multiAudio: { type: Boolean, required: false },
    videoType: { type: String, required: false },
    castDetails: { type: [String], required: true },
    status: {
      type: String,
      required: true,
      enum: ['released', 'coming soon', 'copyright remove'], // specify valid statuses
    },
    tags: { type: [String] },
    createdAt: {
      type: Date,
      require: false,
    },
  }
);

const Movies = model('Movies', moviesModel);

export default Movies;
