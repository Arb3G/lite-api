// buycjs.js

const registration = require('./registration');
const { buyCJS } = require('../routes/buycjs');
const readline = require('readline');

// Helper: Prompt user input from shell
function promptInput(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise(resolve => rl.question(question, answer => {
    rl.close();
    resolve(answer.trim());
  }));
}

// Ask for how much CJS to purchase
async function promptPurchaseAmount() {
  const input = await promptInput('Enter amount of CJS to purchase: ');
  const amount = parseFloat(input);
  if (isNaN(amount) || amount <= 0) {
    console.log('❗ Invalid amount. Please try again.');
    return await promptPurchaseAmount();
  }
  return amount;
}

// Confirm user wants to proceed with purchase
async function confirmPurchase(amount) {
  const confirm = await promptInput(`Proceed with purchase of ${amount} CJS? (yes/no): `);
  return confirm.toLowerCase() === 'yes';
}

// Main CLI wrapper
async function promptBuyCJS(args) {
  if (!args || args.length === 0) {
    console.log('\n💳 Welcome to CJS Pay!');
    console.log('CJS Pay allows you to make secure purchases linked to your Stellar public key.');
    console.log('To begin, we need to verify that you are registered.\n');

    let registeredUser = await registration.promptRegistration();

    while (!registeredUser) {
      const tryAgain = await promptInput('You are not registered. Would you like to try again? (yes/no): ');
      if (tryAgain.toLowerCase() !== 'yes') {
        console.log('Registration cancelled. Exiting.');
        process.exit(0);
      }
      registeredUser = await registration.promptRegistration();
    }

    console.log('\n👍 Registration complete! Let\'s proceed with your purchase.\n');

    const amount = await promptPurchaseAmount();
    const confirmed = await confirmPurchase(amount);

    if (!confirmed) {
      console.log('❌ Purchase cancelled.');
      process.exit(0);
    }

    const result = await buyCJS({ user: registeredUser, amount });

    if (result.success) {
      console.log(`✅ Purchase successful! Transaction ID: ${result.txId}`);
    } else {
      console.error(`🚫 Purchase failed: ${result.error}`);
    }
  }
}

module.exports = { promptBuyCJS };
