// registration.js
const axios = require('axios');
const readline = require('readline');

const API_BASE = 'http://localhost:3000'; // Adjust if deployed

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

async function checkIfRegistered(userId) {
  try {
    const res = await axios.post(`${API_BASE}/register`, { userId, step: 'confirm' });
    return res.data.registered === true;
  } catch (err) {
    console.error('❌ Failed to check registration:', err.message);
    return false;
  }
}

async function promptRegistration(userId) {
  console.log('\n🛡️ Registration Process Initiated');

  if (!userId) {
    userId = await askQuestion('Enter your user ID: ');
  }

  const initial = await axios.post(`${API_BASE}/register`, { userId });
  console.log(`\n${initial.data.message}`);
  console.log(initial.data.explanation);
  const answer = await askQuestion(initial.data.prompt + ' ');

  const confirm = await axios.post(`${API_BASE}/register`, {
    userId,
    step: 'confirm',
    answer,
  });

  if (confirm.data.registered === true) {
    console.log('✅ You are already registered.');
    return { userId };
  }

  if (answer.toLowerCase() !== 'yes') {
    console.log('❌ Registration declined. Exiting.');
    return null;
  }

  const publicKey = await askQuestion('Enter your Stellar public key (starts with G): ');
  const final = await axios.post(`${API_BASE}/register`, {
    userId,
    step: 'register',
    publicKey,
  });

  console.log(`\n${final.data.message}`);
  return final.data.user;
}

module.exports = {
  askQuestion,
  checkIfRegistered,
  promptRegistration,
};
