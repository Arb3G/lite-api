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

async function buyCJS({ user, amount }) {
  // Placeholder: replace with real Stellar purchase logic
  console.log(`Simulating purchase of ${amount} CJS for user ${user.userId} (Stellar address: ${user.publicKey || 'unknown'})`);
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
    console.log('BuyCJS lets you purchase CJS tokens and send them directly to your linked Stellar wallet.');
    console.log('To get started, please tell us if you are already registered.\n');

    const answer = await askQuestion('Are you registered? (yes or no): ');
    const response = answer.trim().toLowerCase();

    if (response !== 'yes' && response !== 'no') {
      console.log('❌ Please answer "yes" or "no".');
      return await promptBuyCJS();
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
      // You might want to fetch the user's linked publicKey here from your backend for purchase
      registeredUser = { userId }; 
    } else {
      console.log('\n🛡️ Registration Process');
      console.log('You will be asked to link your account to a Stellar public key (your CJS address).');
      console.log('This is necessary to verify your identity and securely receive CJS tokens.\n');

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

// CLI standalone support
if (require.main === module) {
  promptBuyCJS(process.argv.slice(2));
}
