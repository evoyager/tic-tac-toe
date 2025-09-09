// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

// Your web app's Firebase configuration
const firebaseConfig = {
  "projectId": "studio-1326460565-b6c4b",
  "appId": "1:610707782019:web:bb8d815ae4e620e1c8deb6",
  "storageBucket": "studio-1326460565-b6c4b.firebasestorage.app",
  "apiKey": "AIzaSyBnGSGhKWl1zwb9jHa04YrnYNHl1aytKEM",
  "authDomain": "studio-1326460565-b6c4b.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "610707782019"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
