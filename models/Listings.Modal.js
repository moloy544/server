import { model, Schema } from "mongoose";

// Define TrendingContent schema
const TrendingContnetSchema = new Schema({
    content_id: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'Movies'  // Reference to the 'movies' collection
    },
    createdAt: { type: Date, required: true },
    updatedAt: { type: Date, required: true }
});

// Create a model based on the schema
const TrendingContnet = model('TrendingContnet', TrendingContnetSchema);

// Export the model
export { TrendingContnet };
