// buycjs.js

const readline = require('readline');
const qrcode = require('qrcode-terminal');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
//const stripe = require('stripe')('sk_test_YOUR_SECRET_KEY'); //  ✅ add your real test key
const registration = require('./registration');
const { checkIfRegistered, promptRegistration } = registration;

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

// Converts token amount to cents (e.g., 1 CJS = $0.01)
function calculateAmountInCents(cjsAmount) {
  const pricePerCJS = 1; // 1 cent per CJS token
  return Math.round(cjsAmount * pricePerCJS);
}

// Create Stripe Checkout Sesion
async function createStripeCheckoutSession(userId, amount) {
  return await stripe.checkout.sessions.create({
    payment_method_types: ['card', 'cashapp'],
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${amount} CJS Token${amount > 1 ? 's' : ''}`,
          },
          unit_amount: calculateAmountInCents(amount),
        },
        quantity: 1,
      },
    ],
    metadata: {
      user_id: userId,
      cjs_amount: amount.toString(),
    },
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
  // Regex: positive number with up to 2 decimal places, e.g. 10, 0.25, 100.00
  return /^\d+(\.\d{1,2})?$/.test(input) && parseFloat(input) > 0;
}

// Main CLI function
async function promptBuyCJS(args) {
  if (!args || args.length === 0) {
    console.log('\n💳 Welcome to BuyCJS!');
    console. log('\n This is from the main directory');
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

    const amount = parseFloat(input);

    const confirmed = await askQuestion(`Proceed with purchase of ${amount} CJS tokens to your registered wallet? (yes/no): `);
    if (confirmed.toLowerCase() !== 'yes') {
      console.log('❌ Purchase cancelled.');
      process.exit(0);
    }

    try {
      console.log('\n⚙️ Creating Stripe Checkout session...');
      const session = await createStripeCheckoutSession(registeredUser.userId, amount);

     // console.log(`\n🔗 Please complete your payment using this link:\n${session.url}\n`);
      console.log(`\n🔗 Please complete your payment using this link or with the QR code:\n\n${session.url}\n\n`);
      // Print QR code in terminal
      qrcode.generate(session.url, { small: true });

      const result = await waitForCheckoutCompletion(session.id);

      console.log(`\n🚀 Payment confirmed. Ready to send ${result.metadata.cjs_amount} CJS to user "${result.metadata.user_id}".`);
      // TODO: Trigger Stellar transfer here (optional)

    } catch (err) {
      console.error(`\n${err.message}`);
      process.exit(1);
    }
  }
}

module.exports = { promptBuyCJS };

// 🔁 Allow standalone CLI usage
if (require.main === module) {
  promptBuyCJS(process.argv.slice(2));
}
