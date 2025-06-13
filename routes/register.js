// routes/register.js
const express = require('express');
const router = express.Router();
const { getUser, registerUser } = require('../services/db');

/**
 * Multi-step guided registration for CJS Pay users.
 *
 * POST /register
 * Body fields: userId, step, answer, publicKey
 *
 * Flow:
 * 1. User sends only userId — gets intro & prompt.
 * 2. User sends step: 'confirm' + answer: yes|no
 * 3. If 'no', user must send publicKey + step: 'register'
 */
router.post('/', async (req, res) => {
  const { userId, step, answer, publicKey } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "userId is required." });
  }

  if (!step) {
    return res.status(200).json({
      message: "Welcome to CJS Pay!",
      explanation: "To use CJS Pay, you must first register. This process links your user ID to a Stellar public key and verifies your identity.",
      prompt: "Are you registered? (yes or no)"
    });
  }

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

  if (step === 'register') {
    if (!publicKey) {
      return res.status(400).json({ error: "publicKey is required." });
    }

    await registerUser(userId, publicKey);
    return res.status(200).json({
      message: "Registration complete.",
      user: { userId, publicKey }
    });
  }

  return res.status(400).json({ error: "Invalid step." });
});

module.exports = router;
