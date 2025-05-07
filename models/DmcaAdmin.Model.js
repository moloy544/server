import { Schema, model } from 'mongoose';

const dmcaAdminSchema = new Schema({
  companyName: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
}, {
  timestamps: true // optional: adds createdAt and updatedAt fields
});

const DmcaAdmin = model('DmcaAdmin', dmcaAdminSchema);

export { DmcaAdmin };
