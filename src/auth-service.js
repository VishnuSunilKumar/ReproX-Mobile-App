import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut 
  } from 'firebase/auth';
  import { doc, setDoc, getDoc } from 'firebase/firestore';
  import { auth, db } from './firebase-config';
  
  class AuthService {
    // User registration
    static async registerUser(email, password, additionalInfo = {}) {
      try {
        const userCredential = await createUserWithEmailAndPassword(
          auth, 
          email, 
          password
        );
        const user = userCredential.user;
  
        // Create user profile in Firestore
        await setDoc(doc(db, 'users', user.uid), {
          email: user.email,
          ...additionalInfo,
          createdAt: new Date(),
          totalPrints: 0
        });
  
        return user;
      } catch (error) {
        console.error("Registration error:", error);
        throw error;
      }
    }
  
    // User login
    static async login(email, password) {
      try {
        const userCredential = await signInWithEmailAndPassword(
          auth, 
          email, 
          password
        );
        return userCredential.user;
      } catch (error) {
        console.error("Login error:", error);
        throw error;
      }
    }
  
    // Get current user
    static getCurrentUser() {
      return auth.currentUser;
    }
  
    // Logout
    static async logout() {
      try {
        await signOut(auth);
      } catch (error) {
        console.error("Logout error:", error);
        throw error;
      }
    }
  }
  
  export default AuthService;