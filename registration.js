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
  console.log('\n🛡️ Registration Proce
