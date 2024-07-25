import { Schema, model } from "mongoose";

const actorsModel = new Schema({
    imdbId: {
        type: String,
        require: true,
    },
    avatar: {
        type: String,
        require: true,
    },
    name: {
        type: String,
        require: true,
    },
    industry: {
        type: String,
        require: true
    }
});

const Actors = model('Actors', actorsModel);

export default Actors;