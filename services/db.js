// db.js with SupaBase
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config(); // only needed locally

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function addUser(userId, publicKey) {
  await supabase.from('users').insert({ id: userId, public_key: publicKey });
}

async function getUser(userId) {
  const { data } = await supabase.from('users').select().eq('id', userId).single();
  return data || null;
}

async function recordPurchase(userId, amount) {
  await supabase.from('purchases').insert({ user_id: userId, amount });
}

module.exports = { addUser, getUser, recordPurchase };
