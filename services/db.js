const admin = require("firebase-admin");
const serviceAccount = require("../firebase-key.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const usersRef = db.collection('users');

async function getUser(userId) {
  const doc = await usersRef.doc(userId).get();
  return doc.exists ? doc.data() : null;
}

async function addUser(userId, publicKey) {
  await usersRef.doc(userId).set({ publicKey });
  return true;
}

module.exports = { getUser, addUser };
