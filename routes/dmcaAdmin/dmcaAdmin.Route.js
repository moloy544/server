import { Router } from "express";
import bcrypt from "bcrypt";
import { DmcaAdmin } from "../../models/DmcaAdmin.Model.js";
import jwt from "jsonwebtoken";
import Movies from "../../models/Movies.Model.js";
import TakedownHistory from "../../models/TakedownHistory.Model.js";
import { sendOtpEmail } from "../../service/service.js";

const router = Router();
const COOKIE_NAME = "dmca_admin_token";
const JWT_SECRET = process.env.JWT_SECRET || "supersecret"; // Replace in production
const COOKIE_EXPIRE_DAYS = 90; // 3 months

// GET /api/v1/dmca-admin/check-auth
router.get('/check-auth', (req, res) => {
  const token = req.cookies.dmca_admin_token;
  if (!token) return res.status(401).json({ message: 'Not logged in' });

  try {
    jwt.verify(token, JWT_SECRET);
    res.status(200).json({ message: 'Authenticated' });
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
});


// SIGNUP ROUTE (once per company)
router.post("/signup", async (req, res) => {
  try {
    const { companyName, username, password } = req.body;
    if (!companyName || !username || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const exists = await DmcaAdmin.findOne({ username });
    if (exists) return res.status(409).json({ message: "Username already exists" });

    const hashed = await bcrypt.hash(password, 10);

    const admin = new DmcaAdmin({ companyName, username, password: hashed });
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
    const token = jwt.sign({ id: admin._id, companyName: admin.companyName }, JWT_SECRET, {
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
    const admin = await DmcaAdmin.findOne({ email });

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
    const admin = await DmcaAdmin.findOne({ email });

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
    }

    // ✅ OTP valid
    admin.otp = null;
    admin.otpExpiresAt = null;
    await admin.save();

    // Generate token
    const token = jwt.sign({ id: admin._id, companyName: admin.companyName }, JWT_SECRET, {
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

    return res.status(200).json({ message: "✅ OTP verified successfully." });

  } catch (err) {
    console.error("Error verifying OTP:", err);
    return res.status(500).json({ message: "Server error. Try again later." });
  }
});


// LOGOUT ROUTE
router.post("/logout", (req, res) => {
  res.clearCookie(COOKIE_NAME);
  res.json({ message: "Logged out" });
});

// imdbId validatin using regex pattern
const imdbIdPattern = /^tt\d{7,}$/;


// ****** DMCA ADMIN ALL AcTIONS ROUTES ****** //

// get preview
router.get("/preview/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const imdbId = id.startsWith("tt") ? id : `tt${id}`;
    if (!imdbId || !imdbIdPattern.test(imdbId.trim())) {
      return res.status(400).json({ error: "Invalid content details" });
    };

    // Get content details from database
    const contentData = await Movies.findOne({ imdbId })
      .select('-_id imdbId title thumbnail releaseYear type isContentRestricted')
      .lean();

    if (!contentData) {
      return res.status(404).json({ message: "Content not found" });
    }

    // Destructure and exclude isContentRestricted & imdbId from final response
    const { isContentRestricted, imdbId: _imdbId, ...rest } = contentData;

    const response = {
      ...rest,
      thumbnail: contentData.thumbnail.replace('tmdb.org', 'mbcdn.net'),
      contentId: contentData.imdbId?.replace('tt', ''),
      disabled: contentData.isContentRestricted === true
    };

    res.json({ contentData: response });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/action/takedown", async (req, res) => {
  try {
    const { content, disabled, takedownCompany } = req.body;

    const id = content?.startsWith("tt") ? content.trim() : `tt${content?.trim()}`;

    if (!id || !/^tt\d{6,9}$/.test(id) || typeof disabled !== "boolean") {
      return res.status(400).json({
        error: "Invalid content details. Please double-check the input or contact the support team.",
      });
    }

    const updatedMovie = await Movies.findOneAndUpdate(
      { imdbId: id },
      { $set: { isContentRestricted: disabled, permanentDisabled: true } },
      { new: true }
    );

    if (!updatedMovie) {
      return res.status(404).json({
        error: "No matching content found. Please verify the details or contact the management team.",
      });
    }

    // ✅ Create takedown record
    const takedownRecord = await TakedownHistory.create({
      content: updatedMovie._id,
      takedownCompany: "MarkScan",
    });

    return res.status(200).json({
      message: "Takedown action completed successfully.",
      takedownRecord: {
        contentId: updatedMovie.imdbId.replace('tt', ''),
        title: updatedMovie.title,
        releaseYear: updatedMovie.releaseYear,
        thumbnail: updatedMovie.thumbnail,
        type: updatedMovie.type,
        createdAt: takedownRecord.createdAt
      }
    });

  } catch (err) {
    console.error("Takedown Error:", err);
    return res.status(500).json({
      message: "Internal server error while processing takedown. Please try again later.",
    });
  }
});

router.get('/get/takedowns', async (req, res) => {
  try {
    // Get `skip` and `limit` from query, with defaults
    const skip = parseInt(req.query.skip) || 0;
    const limit = parseInt(req.query.limit) || 40;

    const takedownHistories = await TakedownHistory.find({})
      .select('createdAt')
      .populate({
        path: 'content',
        model: 'Movies',
        select: 'title releaseYear thumbnail type imdbId -_id',
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Format result with custom field renaming & replacements
    const formatted = takedownHistories
      .map(item => {
        if (!item.content) return null;

        const data = item.content.toObject();

        return {
          title: data.title,
          releaseYear: data.releaseYear,
          thumbnail: data.thumbnail.replace('tmdb.org', 'mbcdn.net'),
          type: data.type,
          contentId: data.imdbId.replace('tt', ''),
          createdAt: item.createdAt
        };
      })
      .filter(Boolean); // remove any nulls

    return res.status(200).json({ takedownHistories: formatted });

  } catch (err) {
    console.error("Takedown Error:", err);
    return res.status(500).json({
      message: "Internal server error while processing takedown. Please try again later.",
    });
  }
});



export default router;
