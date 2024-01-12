import { Schema, model } from "mongoose";

const moviesModel = new Schema({

    imdbId: {
        type: String,
        require: true
    },
    imdbRating:{
        type: Number,
        require: true
    },
    thambnail:{
        type: String,
        require: true,
    },
    title:{
        type: String,
        require: true,
    },
    releaseYear:{
        type: Number,
        require: true,
    },
    fullReleaseDate: {
        type: String, 
        require: true,
    },
    category:{
        type: String,
        require: true,
    },
    type:{
        type: String,
        require: true,
    },
    language:{
        type: String,
        require: true,
    },
    genre:{
        type: Array,
        require: true,
    },
    watchLink:{
        type: String,
        require: true,
    },
    castDetails:{
        type: Array,
        require: true,
    },
    searchKeywords: {
        type: String,
    }
});

const Movies = model('Movies', moviesModel);

export default Movies;