// models/SeriesEpisode.js
import { model, Schema } from 'mongoose';


const seasonSchema = new Schema({
  seasonNumber: { type: Number, required: true },
  basePath: { type: String, required: true },
  type: { type: String, enum: ['Episodes', 'Combined'], default: 'Episodes' }, // 'Combined' = no episodes, play season directly
  episodes: { type: [String], default: [] }
}, { _id: false });

const languageSchema = new Schema({
  language: { type: String, required: true },
  seasons: { type: [seasonSchema], default: [] }
}, { _id: false });

const seriesEpisodeSchema = new Schema({
  imdbId: { type: String, required: true, index: true, unique: true },
  title: { type: String, required: true },
  data: { type: [languageSchema], default: [] }
}, { timestamps: true });

const SeriesEpisode = model('SeriesEpisode', seriesEpisodeSchema);

export default SeriesEpisode;