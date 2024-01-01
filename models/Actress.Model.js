import { Schema, model } from "mongoose";

const actressModel = new Schema({

    avatar: {
        type: String,
        require: true,
    },
    name: {
        type: String,
        require: true,
    }
});

const Actress = model('Actress', actressModel);

export default Actress;