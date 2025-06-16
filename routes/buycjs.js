// buycjs.js
const registration = require('./registration');
const db = require('./services/db');
const readline = require('readline');

/**
 * CLI interface for purchasing CJS Pay credits.
 * - First ensures the user is registered via API flow.
 * - Then prompts for amount and processes purchase.
 */

function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise(resolve => {
    rl.question(query, answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function promptUserForBuyArgs() {
  const userId = await askQuestion('Enter your User ID: ');
  const amountStr = await askQuestion('Enter amount to buy: ');
  const amount = parseFloat(amountStr);

  if (!userId || isNaN(amount) || amount <= 0) {
    console.log('Invalid input for purchase.');
    return null;
  }
  return { userId, amount };
}

async function processPurchase(userId, amount) {
  const user = await db.getUserById(userId);
  if (!user) {
    throw new Error('User not found in DB. Please register via CLI or API.');
  }

  const purchase = await db.recordPurchase(userId, amount);
  console.log('\n✅ Purchase successful!');
  console.log('Details:', purchase);
  return purchase;
}

async function promptBuyCJS(args) {
  if (!args || args.length === 0) {
    console.log('\n💳 Welcome to CJS Pay!');
    console.log('CJS Pay allows you to make secure purchases linked to your Stellar public key.');
    console.log('To begin, we need to verify that you are registered.\n');

    const registeredUser = await registration.promptRegistration();

    if (!registeredUser) {
      console.log('Registration failed or cancelled. Exiting.');
      process.exit(1);
    }

    console.log('\n👍 Registration complete! Let\'s proceed with your purchase.\n');

    const buyArgs = await promptUserForBuyArgs();
    if (!buyArgs) {
      console.log('Invalid buy arguments. Exiting.');
      process.exit(1);
    }

    return await processPurchase(buyArgs.userId, buyArgs.amount);
  } else {
    const userId = args[0];
    const amount = parseFloat(args[1]);
    if (!userId || isNaN(amount) || amount <= 0) {
      throw new Error('Invalid CLI arguments for buycjs.');
    }
    return await processPurchase(userId, amount);
  }
}

async function main() {
  try {
    const args = process.argv.slice(2);
    await promptBuyCJS(args);
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

if (require.main === module) {
  main();
}

module.exports = { promptBuyCJS, main };
