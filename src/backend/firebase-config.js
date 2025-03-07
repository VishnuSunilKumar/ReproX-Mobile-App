import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyBTyrLdRB0NDCX5YuTSPnu-wR1TJud1aFQ",
    authDomain: "xerox-center.firebaseapp.com",
    projectId: "xerox-center",
    storageBucket: "xerox-center.firebasestorage.app",
    messagingSenderId: "770636698050",
    appId: "1:770636698050:web:6f6dc5a8f2d5ed49e9065b"
  };

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const storage = getStorage(app);
  
  export { app, auth, db, storage };