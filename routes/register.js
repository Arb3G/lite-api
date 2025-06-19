// routes/register.js
const express = require('express');
const router = express.Router();
const { getUser, addUser } = require('../services/db');

router.post('/', async (req, res) => {
  const { userId, step, answer, publicKey } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "userId is required." });
  }

  // Initial prompt
  //if (!step) {
  //  return res.status(200).json({
   //   message: "Welcome to CJS Pay!",
    //  explanation: "To use CJS Pay, you must first register. This process links your user ID to a Stellar public key and verifies your identity.",
    //  prompt: "Are you registered? (yes or no)"
 //   });
 // }

  // Step: Confirm registration
  if (step === 'confirm') {
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
}


  // Step: Register user
  if (step === 'register') {
    if (!publicKey) {
      return res.status(400).json({ error: "publicKey is required." });
    }

    try {
      await addUser(userId, publicKey);
      console.log('✅ Registered new user:', { userId, publicKey });

      return res.status(200).json({
        message: "Registration complete.",
        user: { userId, publicKey }
      });
    } catch (error) {
      console.error('❌ Registration error:', error);
      return res.status(500).json({ error: "Failed to register user." });
    }
  }

  // Unknown step
  return res.status(400).json({ error: "Invalid step." });
});

module.exports = router;
