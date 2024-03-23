import { Schema, model } from "mongoose";

const actressModel = new Schema({
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

const Actress = model('Actress', actressModel);

export default Actress;