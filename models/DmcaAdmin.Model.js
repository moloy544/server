import mongoose from "mongoose";

const { Schema, model } = mongoose;

const dmcaAdminSchema = new Schema({
  companyName: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  avatar: { type: String, required: false, default: undefined },
  // now an array to support multiple emails per company
  email: { type: [String], required: true },
  // OTP
  otp: { type: Number, default: null },
  otpExpiresAt: { type: Date, default: null },
  // optional stored token for audit or multi device handling
  token: { type: String, default: null }
}, {
  timestamps: true
});

export const DmcaAdmin = model("DmcaAdmin", dmcaAdminSchema);