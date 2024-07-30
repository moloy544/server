import { Schema, model } from 'mongoose';

// Define the schema for app updates
const appUpdateSchema = new Schema({
    version: { type: String, required: true }, 
    updateLink: { type: String, required: true },
    updateInfo: { type: String, required: true },
    updateTitle: { type: String, required: true },
    releaseDate: { type: Date, default: Date.now },
});

// Create the AppUpdate model if it doesn't already exist
const AppUpdate = model('AppUpdate', appUpdateSchema);

// export models
export { AppUpdate };
