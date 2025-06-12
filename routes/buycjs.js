const express = require('express');
const router = express.Router();
const { initiatePurchase } = require('../services/purchase');

router.post('/', async (req, res) => {
  const { amount, userId } = req.body;

  if (!amount || !userId) {
    return res.status(400).json({ error: "Missing amount or userId" });
  }

  try {
    const result = await initiatePurchase(amount, userId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
