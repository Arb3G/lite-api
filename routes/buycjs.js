// buycjs.js

const { askQuestion, checkIfRegistered, promptRegistration } = require('./registration');

async function buyCJS({ user, amount }) {
  console.log(`Simulating purchase of ${amount} CJS for user ${user.userId}`);
  return { success: true, txId: 'TX1234567890' };
}

async function promptPurchaseAmount() {
  const input = await askQuestion('Enter amount of CJS to purchase: ');
  const amount = parseFloat(input);
  if (isNaN(amount) || amount <= 0) {
    console.log('❗ Invalid amount. Please try again.');
    return await promptPurchaseAmount();
  }
  return amount;
}

async function confirmPurchase(amount) {
  const confirm = await askQuestion(`Proceed with purchase of ${amount} CJS tokens to your registered wallet? (yes/no): `);
  return confirm.toLowerCase() === 'yes';
}

async function promptBuyCJS(args) {
  if (!args || args.length === 0) {
    console.log('\n💳 Welcome to BuyCJS!');
    console.log('BuyCJS is a tool for purchasing CJS tokens and sending them directly to your CJS wallet on the Stellar network.');
    console.log('To begin, we need to verify that you are registered.\n');

    const userId = await askQuestion('Please enter your user ID: ');

    const isRegistered = await checkIfRegistered(userId);

    let registeredUser;

    if (isRegistered) {
      console.log(`\n✅ Welcome back, ${userId}! You're already registered.`);
      registeredUser = { userId };
    } else {
      console.log('\n🛑 You are not registered. Let\'s register you now.\n');
      registeredUser = await promptRegistration(userId);
    }

    if (!registeredUser || !registeredUser.userId) {
      console.log('❌ Unable to verify or register user. Exiting.');
      process.exit(0);
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

if (require.main === module) {
  promptBuyCJS(process.argv.slice(2));
}
