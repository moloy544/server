import { Schema, model } from "mongoose";

const reportsSchema = new Schema({

  movie: {
    type: Schema.Types.ObjectId,
    ref: 'Movies',
    required: true,
  },
  user: {
    type: String,
    require: true
  },
  selectedReports: {
    type: [String],
    required: true,
  },

  writtenReport: {
    type: String,
  },
  reportStatus: {
    type: String,
    default: "Pending",
    enum: ["Pending", "Resolved", "Dismissed"]
  },
  userLocationDetails: {
    type: Object,
    required: false
  },
  reportedAt: {
    type: Date,
    default: Date.now,
  },
});

const requestSchema = new Schema({
  user: {
    type: String,
    required: true,
  },
  contentTitle: {
    type: String,
    required: true
  },
  industery: {
    type: String,
    required: true
  },
  contentYear: {
    type: Number,
    required: false
  },
  languageNeed: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: false
  },
  userEmail:{
    type: String,
    required: false
  },
  reuestStatus: {
    type: String,
    default: "Pending",
    enum: ["Pending", "Resolved", "Dismissed"]
  },
  content: {
    type: Schema.Types.ObjectId,
    ref: 'Movies',
    required: false,
  },
  reply: {
    type: String,
    required: false
  },
  requestedAt: {
    type: Date,
    default: Date.now,
  }
});

const Requests = model('Requests', requestSchema);
const Reports = model('Reports', reportsSchema);

export {
  Requests,  // export requests model
  Reports    // export reports model
};
