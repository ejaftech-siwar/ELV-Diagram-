// FREE role assignment — runs on YOUR computer, no paid Cloud Functions needed.
// 1) Firebase Console > Project settings > Service accounts > Generate new private key
//    Save it next to this file as serviceAccountKey.json  (NEVER commit it to GitHub)
// 2) npm install firebase-admin
// 3) node scripts/set-role.js user@email.com owner      (or: support)
const admin = require("firebase-admin");
admin.initializeApp({ credential: admin.credential.cert(require("./serviceAccountKey.json")) });
const [, , email, role] = process.argv;
if (!email || !["owner", "support"].includes(role)) {
  console.log("Usage: node scripts/set-role.js <email> <owner|support>"); process.exit(1);
}
(async () => {
  const user = await admin.auth().getUserByEmail(email);
  await admin.auth().setCustomUserClaims(user.uid, { role });
  await admin.firestore().doc(`users/${user.uid}`).set({ email, role }, { merge: true });
  console.log(`✔ ${email} is now ${role.toUpperCase()}`);
  process.exit(0);
})().catch(e => { console.error(e.message); process.exit(1); });
