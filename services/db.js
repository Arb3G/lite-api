// db.js with SupaBase
// services/db.js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Add a user to the Supabase table
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

// Get a user by ID
async function getUser(userId) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('❌ Error fetching user:', error.message);
    throw error;
  }

  return data;
}

module.exports = { addUser, getUser };
