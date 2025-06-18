// buycjs.js
const { checkIfRegistered, promptRegistration, askQuestion } = require('./registration');

async function promptInput(q) {
  return await askQuestion(q);
}

async function buyCJS({ user, amount }) {
  console.log(`💸 Simulating purchase of ${amount} CJS for user ${user.userId}`);
  return { success: true, txId: 'TX1234567890' };
}

async function promptPurchaseAmount() {
  const input = await promptInput('Enter amount of CJS to purchase: ');
  const amount = parseFloat(input);
  if (isNaN(amount) || amount <= 0) {
    console.log('❗ Invalid amount. Try again.');
    return await promptPurchaseAmount();
  }
  return amount;
}

async function confirmPurchase(amount) {
  const confirm = await promptInput(`Confirm purchase of ${amount} CJS tokens? (yes/no): `);
  return confirm.toLowerCase() === 'yes';
}

async function promptBuyCJS(args) {
  if (!args || args.length === 0) {
    console.log('\n💳 Welcome to BuyCJS!');
    const userId = await promptInput('Please enter your user ID: ');

    const isRegistered = await checkIfRegistered(userId);
    let registeredUser = { userId };

    if (!isRegistered) {
      console.log('\n🛑 User not registered. Launching registration...');
      registeredUser = await promptRegistration(userId);

      if (!registeredUser || !registeredUser.userId) {
        console.log('❌ Registration failed or cancelled.');
        process.exit(0);
      }

      console.log('\n✅ Registration complete!');
    } else {
      console.log(`\n✅ Welcome back, ${userId}!`);
    }

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
