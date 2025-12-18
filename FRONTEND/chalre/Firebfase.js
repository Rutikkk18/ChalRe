import { initializeApp } from "firebase/app";
import { getMessaging } from "firebase/messaging";

const firebaseConfig = {
   apiKey: "YOUR_API_KEY",
   authDomain: "xxx.firebaseapp.com",
   projectId: "xxx",
   storageBucket: "xxx.appspot.com",
   messagingSenderId: "xxxx",
   appId: "xxx"
};

const app = initializeApp(firebaseConfig);
export const messaging = getMessaging(app);
