import { initializeApp, type FirebaseApp, getApps } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

// Initialize Firebase lazily
function initializeFirebase(): FirebaseApp {
  if (app) {
    return app;
  }

  try {
    // Check if Firebase is already initialized
    const existingApps = getApps();
    if (existingApps.length > 0) {
      app = existingApps[0];
    } else {
      app = initializeApp(firebaseConfig);
    }
    return app;
  } catch (error) {
    console.error("Failed to initialize Firebase:", error);
    throw error;
  }
}

// Get Auth instance
export function getAuthInstance(): Auth {
  if (!auth) {
    const firebaseApp = initializeFirebase();
    auth = getAuth(firebaseApp);
  }
  return auth;
}

// Get Firestore instance
export function getFirestoreInstance(): Firestore {
  if (!db) {
    const firebaseApp = initializeFirebase();
    db = getFirestore(firebaseApp);
  }
  return db;
}

// Export config for debugging
export { firebaseConfig };
export { getFirestoreInstance as db };
