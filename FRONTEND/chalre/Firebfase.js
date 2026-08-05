import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth"; // ✅ ADDED: GoogleAuthProvider
import { getMessaging } from "firebase/messaging";
import { getAnalytics, isSupported } from "firebase/analytics"; // ✅ Analytics — safe init

const firebaseConfig = {
  apiKey: "AIzaSyAyTFvOsOkuvuQu_xj4UlmLg8FcdpSKrPA",
  authDomain: "chalre.firebaseapp.com",
  projectId: "chalre",
  storageBucket: "chalre.firebasestorage.app",
  messagingSenderId: "176731769940",
  appId: "1:176731769940:web:4fdcd92bdc6005580bb1c1",
  measurementId: "G-B4353LW6QT"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const messaging = getMessaging(app);
export const googleProvider = new GoogleAuthProvider(); // ✅ ADDED

// Analytics — resolves to Analytics instance or null — NEVER throws
// isSupported() returns false in unsupported browsers / SSR environments
export const analyticsPromise = isSupported()
  .then((yes) => (yes ? getAnalytics(app) : null))
  .catch(() => null);