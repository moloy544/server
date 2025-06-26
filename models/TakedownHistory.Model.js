import { model, Schema } from 'mongoose';

const takedownHistorySchema = new Schema({
  content: {
    type: Schema.Types.ObjectId,
    ref: 'Movies',
    required: true
  },
  takedownCompany: {
    type: String,
    required: true
  }
}, { timestamps: true });

const TakedownHistory = model('TakedownHistory', takedownHistorySchema);
export default TakedownHistory;