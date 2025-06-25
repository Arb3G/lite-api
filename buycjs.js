// buycjs.js
const open = require('open');
const readline = require('readline');
const qrcode = require('qrcode-terminal');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const registration = require('./registration');
const { checkIfRegistered, promptRegistration } = registration;
const { getUnitPriceUSD } = require('./priceFetcher'); // 🔁 Modularized price logic

const { createClient } = require('@supabase/supabase-js'); // ⬅️ Add this
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
); // ⬅️ And this

const OVERHEAD_RATE = 0.3; // 30% buffer for Stripe + Treasury + LP

// Check for Stripe secret key early
if (!process.env.STRIPE_SECRET_KEY) {
  console.error('❌ Missing Stripe Secret Key. Please set STRIPE_SECRET_KEY in your environment.');
  process.exit(1);
}


// Helper: Prompt user input from shell
function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => rl.question(query, answer => {
    rl.close();
    resolve(answer.trim());
  }));
}

// Converts token amount to cents using dynamic price
function calculateAmountInCents(cjsAmount, unitPriceUSD) {
  return Math.round(cjsAmount * unitPriceUSD * 100);
}

// Create Stripe Checkout Session
async function createStripeCheckoutSession(userId, cjsAmount, grossUSD) {
  return await stripe.checkout.sessions.create({
    payment_method_types: ['card', 'cashapp'],
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${cjsAmount} CJS Token${cjsAmount > 1 ? 's' : ''}`,
          },
          unit_amount: Math.round(grossUSD * 100), // in cents
        },
        quantity: 1,
      },
    ],
    metadata: {
      user_id: userId,
      cjs_amount: cjsAmount.toString(),
      unit_price: grossUSD.toFixed(4),
    },
    customer_creation: 'if_required',
    success_url: 'https://yourapp.com/success',
    cancel_url: 'https://yourapp.com/cancel',
  });
}

// Poll for Stripe Checkout payment confirmation
async function waitForCheckoutCompletion(sessionId, maxTries = 10, intervalMs = 30000) {
  for (let attempt = 1; attempt <= maxTries; attempt++) {
    console.log(`\n🔍 Checking payment status... (Attempt ${attempt}/${maxTries})`);

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === 'paid') {
      console.log(`✅ Payment successful!`);
      return session;
    }

    if (attempt < maxTries) {
      console.log(`⏳ Payment not completed yet. Waiting ${intervalMs / 1000} seconds...`);
      await new Promise(res => setTimeout(res, intervalMs));
    }
  }

  throw new Error('⏱ Payment not completed in time. Please start the process again.');
}

// Validate user input for CJS amount
function isValidAmount(input) {
  return /^\d+(\.\d{1,2})?$/.test(input) && parseFloat(input) > 0;
}

// Main CLI function
async function promptBuyCJS(args) {
  if (!args || args.length === 0) {
    console.log('\n💳 Welcome to BuyCJS!');
    console.log('\nThis is from the main directory');
    console.log('BuyCJS is a tool for purchasing CJS tokens and sending them directly to your CJS wallet on the Stellar network.');

    const answer = await askQuestion('❓ Have you registered? (yes or no): ');
    const response = answer.trim().toLowerCase();

    if (response !== 'yes' && response !== 'no') {
      console.log('❌ Please answer "yes" or "no".');
      return;
    }

    const userId = await askQuestion('Please enter your preferred user ID: ');
    let registeredUser;

    if (response === 'yes') {
      const isRegistered = await checkIfRegistered(userId);
      if (!isRegistered) {
        console.log(`\n🛑 User ID "${userId}" not found. Please register first.`);
        return;
      }
      console.log(`\n✅ Welcome back, ${userId}!`);
      registeredUser = { userId };
    } else {
      console.log('\n🛡️ Registration Process');
      console.log('CJSBuy requires that you link your account to your CJS public key.');
      console.log('This process links your user ID to a Stellar-formatted public key and verifies your identity, in order to handle transactions securely.\n');

      registeredUser = await promptRegistration(userId);

      if (!registeredUser || !registeredUser.userId) {
        console.log('❌ Registration failed or cancelled. Exiting.');
        process.exit(0);
      }

      console.log('\n✅ Registration complete!');
    }

    console.log('\n👍 Let\'s proceed with your purchase.\n');

    // Prompt for amount with validation loop
    let input;
    do {
      input = await askQuestion('Enter amount of CJS to purchase: ');
      if (!isValidAmount(input)) {
        console.log('❗ Invalid amount format. Please enter a positive number (e.g., 10, 0.25).');
      }
    } while (!isValidAmount(input));

    const cjsAmount = parseFloat(input);

    // 🔁 Fetch dynamic unit price
    console.log('\n📈 Fetching live market prices...');
    const unitPrice = await getUnitPriceUSD();
    const baseCost = cjsAmount * unitPrice;

    // 🔁 Apply overhead buffer (Stripe + LP + Treasury)
    const grossTotal = baseCost / (1 - OVERHEAD_RATE);

    console.log(`\n🧮 Market Rate: $${unitPrice.toFixed(4)} per CJS`);
    console.log(`📦 Base Cost: $${baseCost.toFixed(2)} | Total w/ Overhead: $${grossTotal.toFixed(2)}\n`);

    const confirmed = await askQuestion(`Proceed with payment of $${grossTotal.toFixed(2)} for ${cjsAmount} CJS tokens? (yes/no): `);
    if (confirmed.toLowerCase() !== 'yes') {
      console.log('❌ Purchase cancelled.');
      process.exit(0);
    }

    try {
      console.log('\n⚙️ Creating Stripe Checkout session...');
      const session = await createStripeCheckoutSession(registeredUser.userId, cjsAmount, grossTotal);

      console.log(`\n🔗 Please complete your payment using this link:\n${session.url}\n`);
      const HYPERLINK = `\u001b]8;;${session.url}\u0007${session.url}\u001b]8;;\u0007`;
      qrcode.generate(session.url, { small: true });

      const result = await waitForCheckoutCompletion(session.id);

      console.log(`\n🚀 Payment confirmed. Ready to send ${result.metadata.cjs_amount} CJS to user "${result.metadata.user_id}".`);

    } catch (err) {
      console.error(`\n${err.message}`);
      process.exit(1);
    }
  }
}

module.exports = { promptBuyCJS };

if (require.main === module) {
  promptBuyCJS(process.argv.slice(2));
}
