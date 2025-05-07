import { Router } from "express";
import bcrypt from "bcrypt";
import { DmcaAdmin } from "../../models/DmcaAdmin.Model.js";
import jwt from "jsonwebtoken";

const router = Router();
const COOKIE_NAME = "dmca_admin_token";
const JWT_SECRET = process.env.JWT_SECRET || "supersecret"; // Replace in production
const COOKIE_EXPIRE_DAYS = 90; // 3 months

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
    const isProduction = process.env.NODE_ENV === 'production'; // Check if we're in production
    const cookieMaxAge = 3 * 30 * 24 * 60 * 60 * 1000; // 3 months in milliseconds

    res.cookie(COOKIE_NAME, token, {
      path: '/',  // Cookie is available only on the /dmca-admin path
      sameSite: isProduction ? 'none' : 'lax', // For local development, use 'lax'
      secure: isProduction,  // Use 'true' only if running under HTTPS (e.g., in production)
      httpOnly: true, // Makes cookie inaccessible to JavaScript (for security)
      maxAge: cookieMaxAge  // Set cookie expiration time (3 months)
    });    

    res.json({ message: "Login successful", companyName: admin.companyName });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// LOGOUT ROUTE
router.post("/logout", (req, res) => {
  res.clearCookie(COOKIE_NAME);
  res.json({ message: "Logged out" });
});

export default router;
