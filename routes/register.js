// routes/register.js
const express = require('express');
const router = express.Router();
const { getUser, addUser } = require('../services/db');

router.post('/', async (req, res) => {
  const { userId, step, answer, publicKey } = req.body;

  console.log("📥 /register hit with:", req.body);

  if (!userId) {
    return res.status(400).json({ error: "userId is required." });
  }

  // Step: Confirm registration
  if (step === 'confirm') {
    try {
      const user = await getUser(userId);
      if (user) {
        return res.status(200).json({
          registered: true,
          message: "Great! You're ready to make a purchase. Submit your userId and amount to /buycjs."
        });
      } else {
        return res.status(200).json({
          registered: false,
          message: "User not found. Please register."
        });
      }
    } catch (error) {
      console.error("❌ Error checking registration:", error);
      return res.status(500).json({ error: "Failed to check registration." });
    }
  }

  // Step: Register user
  if (step === 'register') {
    if (!publicKey) {
      return res.status(400).json({ error: "publicKey is required." });
    }

    console.log("🔧 Attempting to register user:", { userId, publicKey });

    try {
      await addUser(userId, publicKey);
      console.log("✅ Successfully registered:", { userId });

      return res.status(200).json({
        message: "Registration complete.",
        user: { userId, publicKey }
      });
    } catch (error) {
      console.error("❌ Registration failed:", error);
      return res.status(500).json({ error: "Failed to register user." });
    }
  }

  // Unknown step
  return res.status(400).json({ error: "Invalid step." });
});

module.exports = router;
