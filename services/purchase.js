async function initiatePurchase(amount, userId) {
  // Stub: Replace with real CJS payment logic (e.g. Stellar, Stripe, Google Pay)
  const paymentLink = `https://your-cjs-payments.com/pay?amount=${amount}&user=${userId}`;

  return {
    success: true,
    userId,
    amount,
    paymentLink,
    message: "Send this link to complete the CJS purchase"
  };
}

module.exports = { initiatePurchase };
