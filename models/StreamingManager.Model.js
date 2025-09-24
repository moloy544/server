import { Schema, model } from 'mongoose';

const movieSchema = new Schema({
  imdbId: { type: String, required: true },
  title: { type: String, required: true }
});

const streamingManagerSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true
    },
    password:{
        type: String,
        required: false,
        trim: true
    },
    availableBalance: {
      type: Number,
      default: 0
    },
    expiryDate: {
      type: Date,
      required: true
    },
    movies: [movieSchema],
  },
  { timestamps: true } // auto adds createdAt & updatedAt
);

const StreamingManager = model('StreamingManager', streamingManagerSchema);

export default StreamingManager;