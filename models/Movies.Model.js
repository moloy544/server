import { Schema, model } from "mongoose";

const moviesModel = new Schema({

    imdbId: {
        type: String,
        require: true
    },
    imdbRating: {
        type: Number,
    },
    thambnail: {
        type: String,
        require: true,
    },
    title: {
        type: String,
        require: true,
    },
    releaseYear: {
        type: Number,
        require: true,
    },
    fullReleaseDate: {
        type: Date,
        require: true,
    },
    category: {
        type: String,
        require: true,
    },
    type: {
        type: String,
        require: true,
    },
    language: {
        type: String,
        require: true,
    },
    genre: {
        type: Array,
        require: true,
    },
    watchLink: {
        type: String,
    },
    castDetails: {
        type: Array,
        require: true,
    },
    status: {
        type: String,
        require: true
    },
    tags: {
        type: Array,
        require: false,
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    server: {
        type: String,
        default: 'work'
    },
});

const Movies = model('Movies', moviesModel);

export default Movies;