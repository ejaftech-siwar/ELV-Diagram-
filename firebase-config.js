// ============================================================
// PASTE YOUR FIREBASE WEB CONFIG HERE (Firebase Console >
// Project settings > Your apps > Web app > SDK setup & config)
// Leave as-is to run the app in free offline DEMO MODE.
// ============================================================
export const firebaseConfig = {
  apiKey: "PASTE_API_KEY",
  authDomain: "PASTE_PROJECT.firebaseapp.com",
  projectId: "PASTE_PROJECT_ID",
  appId: "PASTE_APP_ID"
};
export const isConfigured = () => !firebaseConfig.apiKey.startsWith("PASTE");
