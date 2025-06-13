// registration.js
const axios = require('axios');
const readline = require('readline');

const API_BASE = 'http://localhost:3000';

/**
 * CLI wrapper for registering users to CJS Pay via the /register API endpoint.
 * It guides the user through the required steps, using prompts and API calls.
 */

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

async function promptRegistration() {
  console.log('\n🛡️ Registration Process');
  console.log('CJS Pay requires that you link your account to a Stellar public key.');
  console.log('This allows us to verify your identity and handle transactions securely.\n');

  const userId = await askQuestion('Please enter your user ID: ');

  // Step 1: Introduction + prompt
  const step1 = await axios.post(`${API_BASE}/register`, { userId });
  console.log('\n' + step1.data.message);
  console.log(step1.data.explanation);
  const answer = await askQuestion(step1.data.prompt + ' ');

  // Step 2: Confirm registered
  const step2 = await axios.post(`${API_BASE}/register`, {
    userId,
    step: 'confirm',
    answer,
  });

  if (answer.toLowerCase() === 'yes') {
    console.log('\n✅ Registration verified.');
    return { userId };
  }

  // Step 3: New user registration
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
  promptRegistration,
};
