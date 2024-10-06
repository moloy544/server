import { Schema, model } from "mongoose";

const reportsSchema = new Schema({

  movie: {
    type: Schema.Types.ObjectId,
    ref: 'Movies',
    required: true,
  },
  user:{
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
  reportStatus:{
    type: String,
    default: "Pending",
    enum: ["Pending", "Resolved", "Dismissed"]
  },
  reportedAt: {
    type: Date,
    default: Date.now,
  },
});

const Reports = model('Reports', reportsSchema);

export default Reports;
