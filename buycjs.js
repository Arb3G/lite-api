// buycjs.js
const open = require('open');
const readline = require('readline');
const qrcode = require('qrcode-terminal');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const registration = require('./registration');
const { checkIfRegistered, promptRegistration } = registration;
const { getUnitPriceUSD, getPoolData } = require('./priceFetcher');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const STRIPE_FLAT_FEE = 0.30;
const STRIPE_PERCENT_FEE = 0.03;
const SPLIT_PERCENT = 0.40;
const MIN_PURCHASE_USD = 2.00;

function askQuestion(query) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(query, ans => {
    rl.close();
    resolve(ans.trim());
  }));
}

async function createStripeCheckoutSession(userId, cjsAmount, grossUSD) {
  return await stripe.checkout.sessions.create({
    payment_method_types: ['card', 'cashapp'],
    mode: 'payment',
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: { name: `${cjsAmount.toFixed(2)} CJS Token${cjsAmount !== 1 ? 's' : ''}` },
        unit_amount: Math.round(grossUSD * 100),
      },
      quantity: 1,
    }],
    metadata: {
      user_id: userId,
      cjs_amount: cjsAmount.toFixed(2),
      unit_price: (grossUSD / cjsAmount).toFixed(10),
    },
    success_url: 'https://yourapp.com/success',
    cancel_url: 'https://yourapp.com/cancel',
  });
}

async function waitForCheckoutCompletion(sessionId, maxTries = 10, intervalMs = 30000) {
  for (let i = 1; i <= maxTries; i++) {
    console.log(`🔍 Checking payment status... (${i}/${maxTries})`);
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status === 'paid') {
      console.log(`✅ Payment successful!`);
      return session;
    }
    if (i < maxTries) {
      console.log(`⏳ Waiting...`);
      await new Promise(res => setTimeout(res, intervalMs));
    }
  }
  throw new Error('⏱ Payment timeout. Try again.');
}

function isValidResponse(ans) {
  return ans.toLowerCase() === 'yes' || ans.toLowerCase() === 'no';
}

async function promptBuyCJS(args) {
  console.clear();

  console.log('\n💳 Welcome to BuyCJS!');
  console.log('\nBuyCJS is a tool for purchasing CJS tokens and sending them directly to your CJS wallet on the Stellar network.');
  console.log('────────────────────────────────────────────────────────');
  console.log('💡 Here’s what you’re doing:');
  console.log('1️⃣  Confirm your registration status and user ID.');
  console.log('2️⃣  Purchase CJS tokens at the live market price.');
  console.log('3️⃣  Pay securely via Stripe.');
  console.log('4️⃣  Receive your tokens automatically after payment confirmation.\n');
  console.log('📌 Notes:');
  console.log(`- Stripe fees: $${STRIPE_FLAT_FEE.toFixed(2)} + ${(STRIPE_PERCENT_FEE * 100).toFixed(0)}% per transaction.`);
  console.log(`- Funds are split: ${(SPLIT_PERCENT * 100).toFixed(0)}% to Treasury/LP, ${((1 - SPLIT_PERCENT) * 100).toFixed(0)}% to token swap.`);
  console.log(`- Minimum purchase: $${MIN_PURCHASE_USD.toFixed(2)}.`);
  console.log('────────────────────────────────────────────────────────');

  let answer;
  do {
    answer = await askQuestion('❓ Have you registered? (yes or no): ');
    if (!isValidResponse(answer)) {
      console.log('❌ Please answer "yes" or "no".');
    }
  } while (!isValidResponse(answer));

  const userId = await askQuestion('Please enter your preferred user ID: ');

  let registeredUser;
  if (answer.toLowerCase() === 'yes') {
    const isRegistered = await checkIfRegistered(userId);
    if (!isRegistered) {
      console.log(`🛑 User "${userId}" not found. Please register first.`);
      return;
    }
    registeredUser = { userId };
    console.log(`✅ Welcome back, ${userId}!`);
  } else {
    console.log('\n🛡️ Registration Process');
    console.log('CJSBuy requires linking your user ID to a Stellar public key.\n');

    registeredUser = await promptRegistration(userId);

    if (!registeredUser || !registeredUser.userId) {
      console.log('❌ Registration failed or cancelled.');
      return;
    }
    console.log('✅ Registration complete.');
  }

  let usdInput;
  do {
    usdInput = await askQuestion(`\n💰 Enter USD amount to spend (minimum $${MIN_PURCHASE_USD.toFixed(2)}): `);
    if (isNaN(usdInput) || parseFloat(usdInput) < MIN_PURCHASE_USD) {
      console.log(`❗ Please enter a number greater than or equal to $${MIN_PURCHASE_USD.toFixed(2)}.`);
    }
  } while (isNaN(usdInput) || parseFloat(usdInput) < MIN_PURCHASE_USD);

  const grossUSD = parseFloat(usdInput);

  const stripeFee = STRIPE_FLAT_FEE + grossUSD * STRIPE_PERCENT_FEE;
  const remainingAfterStripe = grossUSD - stripeFee;
  const treasurySplit = remainingAfterStripe * SPLIT_PERCENT;
  const usableFunds = remainingAfterStripe - treasurySplit;

  console.log('\n📈 Fetching live market prices...');
  const unitPriceUSD = await getUnitPriceUSD();
  let cjsAmount = usableFunds / unitPriceUSD;

  console.log('\n🔍 Fetching liquidity pool reserves...');
  let poolData;
  try {
    poolData = await getPoolData();
  } catch (error) {
    console.warn('⚠️ Could not fetch liquidity pool data, skipping liquidity check.');
  }

  if (poolData) {
    const { cjsReserve } = poolData;
    const safeLimit = cjsReserve * 0.9;

    console.log(`\n📊 Liquidity Pool Info:`);
    console.log(`• Available CJS in pool: ${cjsReserve.toFixed(2)}`);
    console.log(`• Max allowed purchase: ${safeLimit.toFixed(2)} CJS`);

    if (cjsAmount > safeLimit) {
      console.log(`\n⚠️ Your purchase exceeds available liquidity.`);
      console.log(`⚠️ Limiting your purchase to ${safeLimit.toFixed(2)} CJS tokens.`);
      cjsAmount = safeLimit;
    }
  }

  console.log(`\n🧾 Breakdown:`);
  console.log(`• Stripe Fee (30¢ + 3%): $${stripeFee.toFixed(2)}`);
  console.log(`• Treasury/LP (40%): $${treasurySplit.toFixed(2)}`);
  console.log(`• Net used for tokens: $${usableFunds.toFixed(2)}`);
  console.log(`• Market Price: $${unitPriceUSD.toFixed(7)} per CJS`);
  console.log(`➡️ You will receive approximately ${cjsAmount.toFixed(2)} CJS tokens\n`);

  const confirm = await askQuestion(`Proceed with payment of $${grossUSD.toFixed(2)}? (yes/no): `);
  if (confirm.toLowerCase() !== 'yes') {
    console.log('❌ Purchase cancelled.');
    return;
  }

  try {
    console.log('\n⚙️ Creating Stripe Checkout session...');
    const session = await createStripeCheckoutSession(registeredUser.userId, cjsAmount, grossUSD);

    console.log(`\n🔗 Payment Link:\n${session.url}`);
    qrcode.generate(session.url, { small: true });

    const result = await waitForCheckoutCompletion(session.id);
    console.log(`\n🚀 Payment complete. ${result.metadata.cjs_amount} CJS will be sent to ${result.metadata.user_id}.`);

    // ✅ Log purchase to Supabase
    const { error } = await supabase.from('purchase').insert({
      user_id: result.metadata.user_id,
      amount: parseFloat(result.amount_total / 100), // in USD
      purchased_at: new Date().toISOString(),
      status: 'complete',
    });

    if (error) {
      console.error('❌ Failed to log purchase to Supabase:', error.message);
    } else {
      console.log('📦 Purchase logged successfully in Supabase.');
    }

  } catch (err) {
    console.error(`❌ ${err.message}`);
    process.exit(1);
  }
}

module.exports = { promptBuyCJS };

if (require.main === module) {
  promptBuyCJS(process.argv.slice(2));
}
