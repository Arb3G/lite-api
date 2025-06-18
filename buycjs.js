// buycjs.js
// buycjs.js

const registration = require('./registration');
const readline = require('readline');
const { checkIfRegistered, promptRegistration } = require('./registration');

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

async function promptInput(prompt) {
  return await askQuestion(prompt);
}

async function buyCJS({ user, amount }) {
  // Placeholder: replace with real Stellar purchase logic
  console.log(`Simulating purchase of ${amount} CJS for user ${user.userId}`);
  return { success: true, txId: 'TX1234567890' };
}

async function promptPurchaseAmount() {
  const input = await promptInput('Enter amount of CJS to purchase: ');
  const amount = parseFloat(input);
  if (isNaN(amount) || amount <= 0) {
    console.log('❗ Invalid amount. Please try again.');
    return await promptPurchaseAmount();
  }
  return amount;
}

async function confirmPurchase(amount) {
  const confirm = await promptInput(`Proceed with purchase of ${amount} CJS tokens to your registered wallet? (yes/no): `);
  return confirm.toLowerCase() === 'yes';
}

async function promptBuyCJS(args) {
  if (!args || args.length === 0) {
    console.log('\n💳 Welcome to BuyCJS!');
    console.log('BuyCJS is a tool for purchasing CJS tokens and sending them directly to your CJS wallet on the Stellar network.');
    
    const answer = await askQuestion('❓ Are you registered? (yes or no): ');
    const response = answer.trim().toLowerCase();

    if (response !== 'yes' && response !== 'no') {
      console.log('❌ Please answer "yes" or "no".');
      return;
    }

    const userId = await askQuestion('Please enter your user ID: ');
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
      console.log('CJS Pay requires that you link your account to a Stellar public key.');
      console.log('This allows us to verify your identity and handle transactions securely.\n');

      registeredUser = await promptRegistration(userId);

      if (!registeredUser || !registeredUser.userId) {
        console.log('❌ Registration failed or cancelled. Exiting.');
        process.exit(0);
      }

      console.log('\n✅ Registration complete!');
    }

    console.log('\n👍 Let\'s proceed with your purchase.\n');

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

// 🔁 Allow standalone CLI usage
if (require.main === module) {
  promptBuyCJS(process.argv.slice(2));
}
