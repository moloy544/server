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

// Pre-save middleware to convert the 'name' field to lowercase
actorsModel.pre('save', function(next) {
    if (this.isModified('name')) {
        try {
            this.name = this.name.toLowerCase();
            next(); // Continue with the save operation
        } catch (error) {
            next(error); // Pass the error to error handling middleware
        }
    } else {
        next(); // Proceed if no changes to 'name'
    }
});

const Actors = model('Actors', actorsModel);

export default Actors;