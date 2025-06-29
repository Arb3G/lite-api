// db.js with SupaBase
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function addUser(userId, publicKey) {
  const { data, error } = await supabase
    .from('users')
    .insert([{ user_id: userId, public_key: publicKey }]);

  if (error) {
    console.error('❌ Error inserting user:', error.message);
    throw error;
  }

  console.log('✅ User added:', data);
  return data;
}

async function getUser(userId) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('❌ Error fetching user:', error.message);
    return null;
  }

  return data;
}

module.exports = { addUser, getUser };

