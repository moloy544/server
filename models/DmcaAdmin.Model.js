import { Schema, model } from 'mongoose';

const dmcaAdminSchema = new Schema({
  companyName: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  avatar: { type: String, required: false, default: undefined },
  email: { type: String, required: true },

  // 🔐 OTP fields
  otp: { type: Number, default: null },
  otpExpiresAt: { type: Date, default: null },

}, {
  timestamps: true // adds createdAt and updatedAt
});

const DmcaAdmin = model('DmcaAdmin', dmcaAdminSchema);

export { DmcaAdmin };
