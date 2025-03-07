import { 
    collection, 
    addDoc, 
    updateDoc, 
    doc, 
    query, 
    where, 
    getDocs,
    onSnapshot 
  } from 'firebase/firestore';
  import { db } from './firebase-config';
  
  class PrintService {
    static COLLECTION = 'print_requests';
  
    // Create a new print request
    static async createPrintRequest(printRequest) {
      try {
        const docRef = await addDoc(
          collection(db, this.COLLECTION), 
          {
            ...printRequest,
            status: 'pending',
            createdAt: new Date(),
            updatedAt: new Date()
          }
        );
        return docRef.id;
      } catch (error) {
        console.error("Error creating print request:", error);
        throw error;
      }
    }
  
    // Update print request status
    static async updatePrintRequestStatus(requestId, newStatus) {
      try {
        const requestRef = doc(db, this.COLLECTION, requestId);
        await updateDoc(requestRef, {
          status: newStatus,
          updatedAt: new Date()
        });
      } catch (error) {
        console.error("Error updating print request:", error);
        throw error;
      }
    }
  
    // Real-time listener for all print requests (for admin)
    static listenToAllPrintRequests(callback) {
      return onSnapshot(
        collection(db, this.COLLECTION), 
        (snapshot) => {
          const requests = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          callback(requests);
        }
      );
    }
  
    // Real-time listener for user's print requests
    static listenToUserPrintRequests(userId, callback) {
      const q = query(
        collection(db, this.COLLECTION), 
        where('userId', '==', userId)
      );
  
      return onSnapshot(q, (snapshot) => {
        const requests = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        callback(requests);
      });
    }
  }
  
  export default PrintService;