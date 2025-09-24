import express from "express";
import StreamingManager from "../../../models/StreamingManager.Model.js";

const router = express.Router();

/**
 * Create a new streaming account
 */
router.post("/create", async (req, res) => {
  try {
    const { email, password, availableBalance, expiryDate, movies} = req.body;

    const newAccount = new StreamingManager({
      email,
      password,
      availableBalance,
      expiryDate,
      movies
    });

    await newAccount.save();
   return res.status(201).json(newAccount);
  } catch (error) {
   return res.status(400).json({ message: error.message });
  }
});

/**
 * Get all accounts
 */
router.get("/", async (_, res) => {
  try {
    const accounts = await StreamingManager.find().sort({ updatedAt: -1 });
    res.json(accounts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * Get account by email
 */
router.get("/:email", async (req, res) => {
  try {
    const account = await StreamingManager.findOne({ email: req.params.email });
    if (!account) return res.status(404).json({ message: "Account not found" });
    res.json(account);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * Update account (expiry date, balance, movies, lastUpdatedBy)
 */
router.put("/update/:email", async (req, res) => {
  try {
    const { availableBalance, password, expiryDate, movies, lastUpdatedBy } = req.body;

    const updated = await StreamingManager.findOneAndUpdate(
      { email: req.params.email },
      {
        ...( password && { password }),
        ...(availableBalance !== undefined && { availableBalance }),
        ...(expiryDate && { expiryDate }),
        ...(movies && { movies }),
        ...(lastUpdatedBy && { lastUpdatedBy })
      },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: "Account not found" });

    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

/**
 * Delete account by email
 */
router.delete("/:email", async (req, res) => {
  try {
    const deleted = await StreamingManager.findOneAndDelete({ email: req.params.email });
    if (!deleted) return res.status(404).json({ message: "Account not found" });
    res.json({ message: "Account deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
