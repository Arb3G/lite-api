//registration.js
const axios = require('axios');
const readline = require('readline');

const API_BASE = 'http://localhost:3000'; // Update if deploying

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
    const response = await axios.post(`${API_BASE}/register`, { userId, step: 'confirm' });
    return response.data.registered === true;
  } catch (error) {
    console.error('❌ Error checking registration:', error.message);
    return false;
  }
}

/**
 * Register a new user by collecting their Stellar public key
 * @param {string} userId
 * @returns {Promise<{ userId: string, publicKey?: string }>}
 */

async function promptRegistration(userId) {
  console.log('\n🛡️ Registration Process');
  console.log('CJS Pay requires that you link your account to a Stellar public key.');
  console.log('This allows us to verify your identity and handle transactions securely.\n');

  if (!userId) {
    userId = await askQuestion('Please enter your user ID: ');
  }

  let publicKey = await askQuestion('Enter your Stellar public key (G...): ');

  // Optional: basic format validation
  while (!/^G[A-Z2-7]{55}$/.test(publicKey)) {
    console.log('❌ Invalid Stellar public key format. It must start with "G" and be 56 characters long.');
    publicKey = await askQuestion('Please enter a valid Stellar public key (G...): ');
  }

  try {
    const regRes = await axios.post(`${API_BASE}/register`, {
      userId,
      step: 'register',
      publicKey,
    });

    console.log('\n' + regRes.data.message);
    return regRes.data.user;
  } catch (error) {
    console.error('❌ Registration failed:', error.response?.data || error.message);
    return null;
  }
}

module.exports = {
  askQuestion,
  checkIfRegistered,
  promptRegistration,
};
