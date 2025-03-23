import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBcNrvQ1WqyTuJY-LCjKwpsCQvQiMgfNV0",
  authDomain: "socialmediamarketplaceke.firebaseapp.com",
  projectId: "socialmediamarketplaceke",
  storageBucket: "socialmediamarketplaceke.firebasestorage.app",
  messagingSenderId: "116564147544",
  appId: "1:116564147544:web:1406f99b0deaf8c5ecb92d",
  measurementId: "G-NJEZ35XE7D"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;