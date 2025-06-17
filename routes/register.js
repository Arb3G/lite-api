// routes/register.js
const express = require('express');
const router = express.Router();
const { getUser, addUser } = require('../services/db');

// Basic Stellar public key format validation
function isValidStellarKey(key) {
  return /^G[A-Z2-7]{55}$/.test(key);
}

router.post('/', async (req, res) => {
  const { userId, step, answer, publicKey } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "userId is required." });
  }

  // Step 0 – Initial prompt
  if (!step) {
    return res.status(200).json({
      message: "Welcome to CJS Pay!",
      explanation: "To use CJS Pay, you must first register. This process links your user ID to a Stellar public key and verifies your identity.",
      prompt: "Are you registered? (yes or no)"
    });
  }

  // Step 1 – Confirm existing registration
  if (step === 'confirm') {
    if (answer?.toLowerCase() === 'yes') {
      return res.status(200).json({
        message: "Great! You're ready to make a purchase. Submit your userId and amount to /buycjs."
      });
    } else {
      return res.status(200).json({
        message: "No problem. Please register by sending your userId and Stellar publicKey to this endpoint with step: 'register'."
      });
    }
  }

  // Step 2 – Register new user
  if (step === 'register') {
    if (!publicKey) {
      return res.status(400).json({ error: "publicKey is required." });
    }

    if (!isValidStellarKey(publicKey)) {
      return res.status(400).json({ error: "Invalid Stellar public key format." });
    }

    try {
      const existingUser = await getUser(userId);
      if (existingUser) {
        return res.status(200).json({
          message: "You are already registered.",
          user: existingUser
        });
      }

      await addUser(userId, publicKey);
      console.log(`📥 Registered new user: ${userId}`);
      return res.status(200).json({
        message: "Registration complete.",
        user: { userId, publicKey }
      });
    } catch (error) {
      console.error('❌ Registration failed:', error.message);
      return res.status(500).json({ error: "Registration failed. Please try again later." });
    }
  }

  // Invalid step fallback
  return res.status(400).json({ error: "Invalid step." });
});

module.exports = router;
