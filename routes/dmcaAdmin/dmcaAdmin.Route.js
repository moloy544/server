import { Router } from "express";
import bcrypt from "bcrypt";
import { DmcaAdmin } from "../../models/DmcaAdmin.Model.js";
import jwt from "jsonwebtoken";
import Movies from "../../models/Movies.Model.js";
import TakedownHistory from "../../models/TakedownHistory.Model.js";
import { sendOtpEmail } from "../../service/service.js";
const router = Router();

// imdbId validatin using regex pattern
const imdbIdPattern = /^tt\d{7,}$/;

// Cookies and tokens
const COOKIE_NAME = "dmca_admin_session";
const JWT_SECRET = process.env.JWT_SECRET || "supersecret"; // Replace in production
const COOKIE_EXPIRE_DAYS = 90; // 3 months

const getToken = (req) => {
  const token = req.cookies.dmca_admin_session;
  return token;
};

// GET /api/v1/dmca-admin/check-auth
router.get('/check-auth', (req, res) => {

  try {

    let decoded;
    const token = getToken(req)
    if (!token) return res.status(401).json({ message: 'Not logged in' });

    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(403).json({ error: "Invalid or expired token." });
    }

    const company = decoded?.companyName || decoded?.username;
    if (!company) {
      return res.status(403).json({ error: "Invalid token payload. Username missing." });
    }
    res.status(200).json({ message: 'Authenticated', company });
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
});


// SIGNUP ROUTE (once per company)
router.post("/signup", async (req, res) => {
  try {
    const { companyName, username, password, email } = req.body;
    if (!companyName || !username || !password || !email) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const exists = await DmcaAdmin.findOne({ username });
    if (exists) return res.status(409).json({ message: "Username already exists" });

    const hashed = await bcrypt.hash(password, 10);

    const admin = new DmcaAdmin({
      companyName,
      username,
      email: Array.isArray(email) ? email : [email],
      password: hashed
    });

    await admin.save();

    res.status(201).json({ message: "Signup successful" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// LOGIN ROUTE
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) return res.status(400).json({ message: "Missing credentials" });

    const admin = await DmcaAdmin.findOne({ username });
    if (!admin) return res.status(401).json({ message: "Invalid credentials" });

    const match = await bcrypt.compare(password, admin.password);
    if (!match) return res.status(401).json({ message: "Invalid credentials" });

    // Generate token
    const token = jwt.sign({
      id: admin._id,
      username: admin.username,
      companyName: admin.companyName
    }, JWT_SECRET, {
      expiresIn: `${COOKIE_EXPIRE_DAYS}d`,
    });

    // Set cookie for 3 months
    const cookieMaxAge = 3 * 30 * 24 * 60 * 60 * 1000; // 3 months in milliseconds

    res.cookie(COOKIE_NAME, token, {
      path: '/',
      httpOnly: true,
      secure: true, // required for SameSite=None
      sameSite: 'none', // VERY IMPORTANT
      maxAge: cookieMaxAge, // 3 months
    });

    res.json({ message: "Login successful", companyName: admin.companyName });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post('/send-otp', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    const admin = await DmcaAdmin.findOne({ email: { $in: [email] } });

    if (!admin) {
      return res.status(404).json({ message: "❌ Email is not registered" });
    }

    const otp = Math.floor(1000 + Math.random() * 9000); // 4-digit OTP
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 mins from now

    // Save OTP and expiry to admin doc
    admin.otp = otp;
    admin.otpExpiresAt = expiry;
    await admin.save();

    // Send OTP via email
    await sendOtpEmail(email, otp);

    return res.status(200).json({ message: "✅ OTP sent to registered email." });

  } catch (err) {
    console.error("Error in sending OTP:", err);
    return res.status(500).json({ message: "Server error. Please try again later." });
  }
});


// Verify OTP Route
router.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ message: "Email and OTP are required." });
  }

  try {
    const admin = await DmcaAdmin.findOne({ email: { $in: [email] } });

    if (!admin || !admin.otp) {
      return res.status(404).json({ message: "OTP not found or expired. Please resend." });
    }

    if (admin.otp !== parseInt(otp)) {
      return res.status(401).json({ message: "❌ Invalid OTP." });
    }

    if (admin.otpExpiresAt && admin.otpExpiresAt < new Date()) {
      admin.otp = null;
      admin.otpExpiresAt = null;
      await admin.save();
      return res.status(410).json({ message: "⏰ OTP expired. Please request a new one." });
    };

    // Generate token
    const token = jwt.sign({
      id: admin._id,
      username: admin.username,
      companyName: admin.companyName
    }, JWT_SECRET, {
      expiresIn: `${COOKIE_EXPIRE_DAYS}d`,
    });

    // Set cookie for 3 months
    const cookieMaxAge = 3 * 30 * 24 * 60 * 60 * 1000; // 3 months in milliseconds

    // ✅ OTP valid
    admin.otp = null;
    admin.otpExpiresAt = null;
    admin.token = token;
    await admin.save();

    res.cookie(COOKIE_NAME, token, {
      path: '/',
      httpOnly: true,
      secure: true, // required for SameSite=None
      sameSite: 'none', // VERY IMPORTANT
      maxAge: cookieMaxAge, // 3 months
    });

    return res.status(200).json({ message: "✅ OTP verified successfully." });

  } catch (err) {
    console.error("Error verifying OTP:", err);
    return res.status(500).json({ message: "Server error. Try again later." });
  }
});


// LOGOUT ROUTE
router.post("/logout", (req, res) => {
  res.clearCookie(COOKIE_NAME, {
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'none',
  });
  res.json({ message: "Logged out" });

});


// ****** DMCA ADMIN ALL AcTIONS ROUTES ****** //

// GET /api/v1/dmca-admin/preview/:id
router.get("/preview/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const imdbId = id.startsWith("tt") ? id : `tt${id}`;

    if (!imdbId || !imdbIdPattern.test(imdbId.trim())) {
      return res.status(400).json({ error: "Invalid content details" });
    }

    // Token check
    const token = getToken(req);
    if (!token) return res.status(401).json({ message: "Not logged in" });

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      return res.status(403).json({ error: "Invalid or expired token." });
    }

    const username = decoded?.username;
    if (!username) return res.status(403).json({ error: "Invalid token payload. Username missing." });

    // Fetch content from DB
    const contentData = await Movies.findOne({ imdbId })
      .select("_id imdbId title thumbnail releaseYear type isContentRestricted")
      .lean();

    if (!contentData) {
      return res.status(404).json({ message: "Content not found" });
    }

    // Prepare base response
    const response = {
      title: contentData.title,
      releaseYear: contentData.releaseYear,
      type: contentData.type,
      thumbnail: contentData.thumbnail.replace("tmdb.org", "mbcdn.net"),
      contentId: contentData.imdbId.replace("tt", ""),
      disabled: contentData.isContentRestricted === true,
      isTakedownByYou: false,
    };

    // If content is disabled, check if current admin took it down
    if (response.disabled) {
      const takedownRecord = await TakedownHistory.findOne({
        takedownCompany: username,
        content: contentData._id
      });

      response.isTakedownByYou = !!takedownRecord;
    }

    return res.json({ contentData: response });

  } catch (err) {
    console.error("Error in preview route:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/action/takedown", async (req, res) => {
  try {
    const { content, disabled } = req.body;
    const token = getToken(req);

    if (!token) return res.status(401).json({ error: "Unauthorized. Token missing." });

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(403).json({ error: "Invalid or expired token." });
    }

    const username = decoded?.username;
    if (!username) return res.status(403).json({ error: "Invalid token payload. Username missing." });

    const id = content?.startsWith("tt") ? content.trim() : `tt${content?.trim()}`;
    if (!id || !/^tt\d{6,9}$/.test(id) || typeof disabled !== "boolean") {
      return res.status(400).json({ error: "Invalid content details. Please double-check the input or contact support." });
    }

    // ✅ Update Movie Status
    const updatedMovie = await Movies.findOneAndUpdate(
      { imdbId: id },
      { $set: { isContentRestricted: disabled } },
      { new: true }
    );

    if (!updatedMovie) {
      return res.status(404).json({ error: "No matching content found." });
    }

    // ✅ Check for existing Takedown by same company
    const existingRecord = await TakedownHistory.findOne({
      content: updatedMovie._id,
      takedownCompany: username,
    });

    if (existingRecord) {
      // Update timestamp
      existingRecord.updatedAt = new Date();
      await existingRecord.save();

      return res.status(200).json({
        message: "Takedown already exists. Timestamp updated.",
        alreadyExists: true,
        takedownRecord: {
          contentId: updatedMovie.imdbId.replace('tt', ''),
          title: updatedMovie.title,
          releaseYear: updatedMovie.releaseYear,
          thumbnail: updatedMovie.thumbnail,
          type: updatedMovie.type,
          disabled: updatedMovie.isContentRestricted,
          createdAt: existingRecord.createdAt,
          updatedAt: existingRecord.updatedAt,
        }
      });
    }

    // ✅ Create New Record (only if not already taken down by this company)
    const newRecord = await TakedownHistory.create({
      content: updatedMovie._id,
      takedownCompany: username,
    });

    return res.status(200).json({
      message: "Takedown action completed successfully.",
      takedownRecord: {
        contentId: updatedMovie.imdbId.replace('tt', ''),
        title: updatedMovie.title,
        releaseYear: updatedMovie.releaseYear,
        thumbnail: updatedMovie.thumbnail,
        type: updatedMovie.type,
        disabled: updatedMovie.isContentRestricted,
        createdAt: newRecord.createdAt,
        updatedAt: newRecord.updatedAt,
      }
    });

  } catch (err) {
    console.error("Takedown Error:", err);
    return res.status(500).json({
      message: "Internal server error while processing takedown.",
    });
  }
});

// Gte Takedowns history route

router.get('/get/takedowns', async (req, res) => {
  try {
    const skip = parseInt(req.query.skip) || 0;
    const limit = 50; // You said backend always uses 50

    const token = getToken(req);
    if (!token) return res.status(401).json({ error: "Unauthorized. Token missing." });

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      return res.status(403).json({ error: "Invalid or expired token." });
    }

    const username = decoded?.username;
    if (!username) return res.status(403).json({ error: "Invalid token. Username missing." });

    // Fetch one extra item to check if more data exists
    const rawData = await TakedownHistory.find({ takedownCompany: username })
      .select('createdAt')
      .populate({
        path: 'content',
        model: 'Movies',
        select: 'title releaseYear thumbnail type imdbId isContentRestricted -_id',
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit + 1); // fetch one more than needed

    const hasMore = rawData.length > limit;

    // Trim to exact limit
    const limitedData = hasMore ? rawData.slice(0, limit) : rawData;

    const formatted = limitedData
      .map(item => {
        if (!item.content) return null;
        const data = item.content.toObject();
        return {
          title: data.title,
          releaseYear: data.releaseYear,
          thumbnail: data.thumbnail.replace('tmdb.org', 'mbcdn.net'),
          type: data.type,
          contentId: data.imdbId.replace('tt', ''),
          disabled: data.isContentRestricted,
          createdAt: item.createdAt
        };
      })
      .filter(Boolean);

    return res.status(200).json({
      takedownHistories: formatted,
      endOfData: !hasMore
    });

  } catch (err) {
    console.error("Takedown Error:", err);
    return res.status(500).json({
      message: "Internal server error while processing takedown. Please try again later.",
    });
  }
});


// Handle toggle disabled/enabled
router.post("/action/toggle", async (req, res) => {
  const token = getToken(req);
  const { contentId, disabled, previewItemUpdate } = req.body;

  if (!token || typeof disabled !== "boolean") {
    return res.status(400).json({ message: "Missing token or invalid status." });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return res.status(403).json({ message: "Invalid or expired token." });
  }

  const imdbId = contentId.startsWith("tt") ? contentId : `tt${contentId}`;

  // First: find the current movie
  const movie = await Movies.findOne({ imdbId });

  if (!movie) {
    return res.status(404).json({ message: "Movie not found." });
  }

  // ✅ Compare current and new status
  if (movie.isContentRestricted === disabled) {
    return res.status(200).json({
      message: "No change needed. Status already matches.",
      ...(previewItemUpdate ? { content: movie } : {})
    });
  }

  // ✅ Only update if value is different (and triggers updatedAt change)
  movie.isContentRestricted = disabled;
  await movie.save(); // this will auto update `updatedAt`

  const response = {
    message: "Status updated successfully.",
    ...(previewItemUpdate ? { content: movie } : {})
  };

  res.json(response);
});

export default router;
