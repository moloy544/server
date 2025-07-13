import { Schema, model } from "mongoose";

const SubscriptionSchema = new Schema({
  endpoint: String,
  expirationTime: String,
  keys: {
    p256dh: String,
    auth: String
  }
});
const WebPushSubscriptionModel = model("WebPushSubscription", SubscriptionSchema);

export default WebPushSubscriptionModel
