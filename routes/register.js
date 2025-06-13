const express = require('express');
const router = express.Router();
const db = require('../services/db');

/*
Expected Client Interaction Flow:

1. Initial request:
   POST /register with empty body {}
   → Response: Introduction + "Are you registered? (yes/no)", step: "askRegistered"

2. User says "no":
   POST /register with { step: "askRegistered", response: "no" }
   → Response: "Please provide new userId and publicKey", step: "getRegistrationInfo"

3. User provides registration info:
   POST /register with { step: "getRegistrationInfo", userId: "user123", publicKey: "GABC..." }
   → Response: "Thanks user123, you've been registered.", canProceedToBuy: true

4. If user says "yes":
   POST /register with { step: "askRegistered", response: "yes" }
   → Response: "Please provide your userId", step: "confirmUserId"

5. User submits userId:
   POST /register with { step: "confirmUserId", userId: "user123" }
   → If found: success = true, canProceedToBuy = true
   → If not found: prompts to register (step: getRegistrationInfo)

*/

router.post('/', async (req, res) => {
  const { step, userId, publicKey, response } = req.body;

  // Step 0: Introduction + initial prompt
  if (!step) {
    return res.json({
      message:
        "To use this service, you must first register a unique user ID and link it to your CJS Wallet Public Key. This allows us to securely verify your identity and connect payments to your wallet.\n\nAre you registered? (yes/no)",
      step: "askRegistered"
    });
  }

  // Step 1: Ask if they are registered
  if (step === "askRegistered") {
    if (response === "yes") {
      return res.json({ message: "Please provide your userId.", step: "confirmUserId" });
    } else if (response === "no") {
      return res.json({
        message: "Let's register you. Please provide a new userId and your CJS Wallet Public Key.",
        step: "getRegistrationInfo"
      });
    } else {
      return res.json({
        message: "Invalid response. Please answer yes or no.",
        step: "askRegistered"
      });
    }
  }

  // Step 2: Confirm userId for existing user
  if (step === "confirmUserId") {
    const existing = await db.getUser(userId);
    if (existing) {
      return res.json({
        success: true,
        message: `Welcome back, ${userId}. You are registered.`,
        publicKey: existing.publicKey,
        canProceedToBuy: true
      });
    } else {
      return res.json({
        success: false,
        message: "User not found. Please register with a userId and publicKey.",
        step: "getRegistrationInfo"
      });
    }
  }

  // Step 3: Register new user
  if (step === "getRegistrationInfo") {
    if (!userId || !publicKey) {
      return res.json({
        message: "Please provide both userId and publicKey.",
        step: "getRegistrationInfo"
      });
    }

    await db.addUser(userId, publicKey);
    return res.json({
      success: true,
      message: `Thanks ${userId}, you've been registered.`,
      canProceedToBuy: true
    });
  }

  return res.status(400).json({ message: "Invalid step." });
});

module.exports = router;
