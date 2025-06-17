const axios = require('axios');
const readline = require('readline');

const API_BASE = 'http://localhost:3000'; // Replace with your Codespace URL if needed

function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => rl.question(query, ans => {
    rl.close();
    resolve(ans.trim());
  }));
}

/**
 * Check if a user is already registered
 * @param {string} userId
 * @returns {Promise<boolean>}
 */
async function checkIfRegistered(userId) {
  try {
    const response = await axios.post(`${API_BASE}/register`, {
      userId,
      step: 'confirm',
      answer: 'yes'
    });
    return response.data.registered === true;
  } catch (error) {
    console.error('❌ Error checking registration:', error.message);
    return false;
  }
}


/**
 * Runs the full interactive registration flow if the user is not already registered
 * @param {string} userId - optional if not provided upfront
 * @returns {Promise<{ userId: string, publicKey?: string }>} user record
 */
async function promptRegistration(userId) {
  console.log('\n🛡️ Registration Process');
  console.log('CJS Pay requires that you link your account to a Stellar public key.');
  console.log('This allows us to verify your identity and handle transactions securely.\n');

  // If not passed in, prompt the user
  if (!userId) {
    userId = await askQuestion('Please enter your user ID: ');
  }

  // Step 1: Send initial check to API for prompt message
  const step1 = await axios.post(`${API_BASE}/register`, { userId });
  console.log('\n' + step1.data.message);
  console.log(step1.data.explanation);
  const answer = await askQuestion(step1.data.prompt + ' ');

  // Step 2: Confirm intent
  const step2 = await axios.post(`${API_BASE}/register`, {
    userId,
    step: 'confirm',
    answer,
  });

  if (answer.toLowerCase() === 'yes') {
    console.log('\n✅ Registration verified.');
    return { userId };
  }

  // Step 3: Full new registration
  console.log('\n📥 Let\'s complete your registration.');
  const publicKey = await askQuestion('Enter your Stellar public key (G...): ');
  const regRes = await axios.post(`${API_BASE}/register`, {
    userId,
    step: 'register',
    publicKey,
  });

  console.log('\n' + regRes.data.message);
  return regRes.data.user;
}

module.exports = {
  askQuestion,
  checkIfRegistered,
  promptRegistration,
};
