// db.js with SupaBase
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function addUser(userId, publicKey) {
  await supabase.from('users').insert({ user_id: userId, public_key: publicKey }); // ✅ fixed
}

async function getUser(userId) {
  const { data } = await supabase.from('users').select().eq('user_id', userId).single(); // ✅ fixed
  return data || null;
}

async function recordPurchase(userId, amount) {
  await supabase.from('purchases').insert({ user_id: userId, amount });
}

module.exports = { addUser, getUser, recordPurchase };
