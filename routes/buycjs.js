// routes/buycjs.js
const express = require('express');
const router = express.Router();
const { initiatePurchase } = require('../services/purchase');
const { getUser, registerUser } = require('../services/db');

router.post('/', async (req, res) => {
  const { userId, amount, step, answer, publicKey } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "userId is required." });
  }

  if (!step) {
    return res.status(200).json({
      message: "To use CJS Pay, you must be registered.",
      explanation: "Registration links your user ID to a Stellar public key for secure payments.",
      prompt: "Are you registered? (yes or no)"
    });
  }

  if (step === 'confirm') {
    if (answer?.toLowerCase() === 'yes') {
      return res.status(200).json({
        message: "Great! Now send your userId and amount with step: 'purchase'."
      });
    } else {
      return res.status(200).json({
        message: "Please register by sending your userId and publicKey with step: 'register'."
      });
    }
  }

  if (step === 'register') {
    if (!publicKey) {
      return res.status(400).json({ error: "publicKey is required for registration." });
    }
    const newUser = await registerUser(userId, publicKey);
    return res.status(200).json({
      message: "Registration successful.",
      user: newUser
    });
  }

  if (step === 'purchase') {
    if (!amount) {
      return res.status(400).json({ error: "Amount is required." });
    }

    const user = await getUser(userId);
    if (!user) {
      return res.status(401).json({ error: "User not found. Please register first." });
    }

    const result = await initiatePurchase(amount, userId, user.publicKey);
    return res.json(result);
  }

  return res.status(400).json({ error: "Invalid step." });
});

module.exports = router;
