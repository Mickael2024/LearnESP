import { getAnalytics } from 'firebase/analytics';
// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAcVQXQOV84D8WOkJqniFrBOBUD2gFW64w",
  authDomain: "learnesparduino.firebaseapp.com",
  projectId: "learnesparduino",
  storageBucket: "learnesparduino.firebasestorage.app",
  messagingSenderId: "1033188785105",
  appId: "1:1033188785105:web:017ea020f0f47709bb7ef0",
  measurementId: "G-WVYGRP4BRT"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);