const express = require('express');
const router = express.Router();
const { initiatePurchase } = require('../services/purchase');
const { getUser } = require('../services/db'); // <-- add this line

router.post('/', async (req, res) => {
  const { amount, userId } = req.body;

  if (!amount || !userId) {
    return res.status(400).json({ error: "Missing amount or userId" });
  }

  const user = await getUser(userId);
  if (!user) {
    return res.status(401).json({
      error: "User not registered. Please POST to /register first."
    });
  }

  try {
    const result = await initiatePurchase(amount, userId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
