// Firebase configuration
import { initializeApp } from 'firebase/app'
import { getStorage } from 'firebase/storage'
import { getFirestore } from 'firebase/firestore'

// Your Firebase configuration
// Option 1: Use environment variables (recommended for production)
// Create a .env file in your project root with VITE_ prefixed variables
// Option 2: Replace these values directly with your Firebase project configuration
// You can find these in your Firebase Console > Project Settings > General > Your apps
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyC-c1S5oUoD4hPmaZ_CiKcqkANs8MWHsIg',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'beatify-873fb.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'beatify-873fb',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'beatify-873fb.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '901163740976',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:901163740976:web:2e499fa57f57a117a062f5',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-1HQMQ6WELT'
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize Firebase Storage
export const storage = getStorage(app)

// Initialize Firestore Database
export const db = getFirestore(app)

export default app
