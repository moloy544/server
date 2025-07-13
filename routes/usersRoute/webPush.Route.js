import { Router } from "express";
import webpush from "web-push";
import WebPushSubscriptionModel from "../../models/WebPushSubscription.Model.js";

const router = Router();

// VAPID keys
const VAPID_PUBLIC_KEY = "BHIeVfIKg2QDgjXRWcjWyi_Xii-Gz_MVjSO93wDU0bazbXhz-5-0EKclRIw41ZhwteL97DKofi5lPbGogkrdmtU";
const VAPID_PRIVATE_KEY = "fhV6R7JYcKfH20yTePZQG2iHe1Ugi1marHaLyiXIxWg";

webpush.setVapidDetails(
  "mailto:moviesbazarorg@gmail.com",
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

// 🔓 GET /public-key → send VAPID public key to frontend
router.get("/public-key", (_, res) => {
  res.send(VAPID_PUBLIC_KEY);
});

// 💾 POST /save-subscription → save user's subscription to DB
router.post("/save-subscription", async (req, res) => {

  const { endpoint } = req.body;

  if (!endpoint) {
    return res.status(400).json({ message: "Invalid subscription format" });
  }

  const exists = await WebPushSubscriptionModel.findOne({ endpoint });

  if (!exists) {
    await WebPushSubscriptionModel.create(req.body);
    console.log("✅ New subscription saved.");
  }

  res.status(201).json({ message: "Subscription stored" });
});

// 🚀 POST /send-push → send push to all users (admin trigger)
router.post("/send-push", async (req, res) => {
  const { title, body, url } = req.body;

  if (!title || !url) {
    return res.status(400).json({ message: "movieTitle and movieUrl are required" });
  }

  const payload = JSON.stringify({
    title,
    body,
    url
  });

  const subscriptions = await WebPushSubscriptionModel.find({});
  let sent = 0, removed = 0;

  const results = await Promise.allSettled(
    subscriptions.map((sub) => webpush.sendNotification(sub, payload))
  );

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const sub = subscriptions[i];
    if (result.status === "fulfilled") {
      sent++;
    } else {
      const code = result.reason.statusCode;
      console.error(`❌ Failed to send push to ${sub.endpoint} (code: ${code})`);
      if (code === 410 || code === 404) {
        await WebPushSubscriptionModel.deleteOne({ endpoint: sub.endpoint });
        removed++;
      }
    }
  }

  res.json({ message: `✅ Sent to ${sent}, removed ${removed} dead subscriptions.` });
});

export default router;
