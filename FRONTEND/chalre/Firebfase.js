import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getMessaging } from "firebase/messaging";

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
