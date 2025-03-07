import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, useNavigate, useLocation } from 'react-router-dom';
import './App.css';
import { auth, db, storage } from './firebase';

import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  serverTimestamp ,
  onSnapshot
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';



// Theme Context for dark/light mode
const ThemeContext = React.createContext({
  darkMode: false,
  toggleTheme: () => {}
});

// Auth Context for user authentication
const AuthContext = React.createContext({
  currentUser: null,
  login: () => {},
  logout: () => {},
  register: () => {},
  userProfile: null,
});

// Theme Provider Component
const ThemeProvider = ({ children }) => {
  const [darkMode, setDarkMode] = useState(false);
  
  const toggleTheme = () => {
    setDarkMode(!darkMode);
    if (!darkMode) {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
  };
  
  return (
    <ThemeContext.Provider value={{ darkMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Auth Provider Component
const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        // Fetch user profile
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            setUserProfile(userDoc.data());
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
        }
      } else {
        setUserProfile(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const register = async (email, password) => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      // Create user profile in Firestore
      await setDoc(doc(db, 'users', result.user.uid), {
        email: email,
        createdAt: serverTimestamp(),
        printCount: 0,
      });
      return result;
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    return signOut(auth);
  };

  const value = {
    currentUser,
    login,
    register,
    logout,
    userProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

// Login Page Component
const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { darkMode } = React.useContext(ThemeContext);
  const { login } = React.useContext(AuthContext);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      await login(email, password);
      navigate('/home');
    } catch (error) {
      console.error("Login error:", error);
      setError('Failed to log in. Please check your credentials.');
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className={`login-container ${darkMode ? 'dark-theme' : ''}`}>
      <div className="login-card">
        <div className="profile-icon">
          <div className="avatar"></div>
        </div>
        <h2>Welcome!</h2>
        {error && <p className="error-message">{error}</p>}
        <form onSubmit={handleLogin}>
          <div className="input-group">
            <input 
              type="email" 
              placeholder="Email Address" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="input-group">
            <input 
              type={showPassword ? "text" : "password"}
              placeholder="Password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <span 
              className="password-toggle" 
              onClick={togglePasswordVisibility}
            >
              {showPassword ? '👁️‍🗨️' : '👁️'}
            </span>
          </div>
          <button type="submit" className="login-button">Login</button>
        </form>
      </div>
    </div>
  );
};

// Home Page Component
const Home = () => {
  const navigate = useNavigate();
  const { darkMode, toggleTheme } = React.useContext(ThemeContext);
  const { currentUser, userProfile } = React.useContext(AuthContext);

  return (
    <div className={`home-container ${darkMode ? 'dark-theme' : ''}`}>
      <div className="header">
        <h2>XEROX</h2>
        <div className="theme-toggle" onClick={toggleTheme}>
        </div>
      </div>
      <div className="content">
        <div className="request-print-card">
          <h3>Request Print</h3>
          <p>Request for your documents to be printed.</p>
          <button 
            className="start-printing-button"
            onClick={() => navigate('/print')}
          >
            Start Printing
          </button>
        </div>
      </div>
      <div className="nav-bar">
        <div className="nav-item active">
          <div className="nav-icon home-icon"></div>
          <span>Home</span>
        </div>
        <div className="nav-item" onClick={() => navigate('/profile')}>
          <div className="nav-icon profile-icon"></div>
          <span>Profile</span>
        </div>
      </div>
    </div>
  );
};

// Print Page Component
const Print = () => {
  const [files, setFiles] = useState([]);
  const [copies, setCopies] = useState(1);
  const [printOption, setPrintOption] = useState('black');
  const [printSided, setPrintSided] = useState('single');
  const [totalPrice, setTotalPrice] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [comments, setComments] = useState(''); // New state for comments
  const navigate = useNavigate();
  const { darkMode } = React.useContext(ThemeContext);
  const { currentUser } = React.useContext(AuthContext);

  const handleFileChange = (e) => {
    if (e.target.files.length > 0) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) {
      setFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  // Calculate price whenever relevant values change
  useEffect(() => {
    const calculatePrice = () => {
      // Base price per page
      const basePrice = printOption === 'black' ? 1 : 12;
      
      // Number of pages (using file count as a proxy for page count)
      const pageCount = files.length || 0;
      
      // Calculate price based on copies and pages
      let price = basePrice * pageCount * copies;
      
      // Apply double-sided discount if applicable (for simplicity, assuming 5% discount)
      if (printSided === 'double' && pageCount > 1) {
        price = price * 0.95;
      }
      
      return price;
    };
    
    setTotalPrice(calculatePrice());
  }, [files, copies, printOption, printSided]);

  const handlePrint = async () => {
    if (files.length > 0) {
      setUploading(true);
      
      try {
        // Upload files to Firebase Storage
        const fileURLs = [];
        const fileNames = [];
        
        for (const file of files) {
          const storageRef = ref(storage, `print_files/${currentUser.uid}/${Date.now()}_${file.name}`);
          const snapshot = await uploadBytes(storageRef, file);
          const downloadURL = await getDownloadURL(snapshot.ref);
          
          fileURLs.push(downloadURL);
          fileNames.push(file.name);
        }
        
        // Navigate to payment with details
        navigate('/payment', { 
          state: { 
            totalPrice,
            printDetails: {
              files: fileNames,
              fileURLs,
              copies,
              printOption,
              printSided,
              pageCount: files.length, // This is just a proxy, in a real app you'd calculate actual pages
              comments: comments // Include comments in print details
            }
          } 
        });
      } catch (error) {
        console.error("Error uploading files:", error);
        alert("Error uploading files. Please try again.");
      } finally {
        setUploading(false);
      }
    }
  };

  return (
    <div className={`print-container ${darkMode ? 'dark-theme' : ''}`}>
      <div className="header">
        <div className="back-button" onClick={() => navigate('/home')}>←</div>
        <h2>Print</h2>
      </div>
      <div className="print-content">
        <div 
          className="drop-area" 
          onDrop={handleDrop} 
          onDragOver={handleDragOver}
          onClick={() => document.getElementById('file-input').click()}
        >
          <div className="drop-icon"></div>
          <p>Click to upload or drag and drop</p>
          <input 
            id="file-input" 
            type="file" 
            multiple 
            style={{ display: 'none' }} 
            onChange={handleFileChange} 
          />
        </div>
        
        {files.length > 0 && (
          <div className="file-list">
            <p>Selected: {files.map(file => file.name).join(', ')}</p>
          </div>
        )}
        
        <div className="print-options">
          <div className="option-group">
            <label>Number Of Copies</label>
            <input 
              type="number" 
              min="1" 
              value={copies} 
              onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value) || 1))} 
            />
          </div>
          
          <div className="option-group">
            <label>Print Sides</label>
            <div className="color-options">
              <button 
                className={`option-button ${printSided === 'single' ? 'active' : ''}`} 
                onClick={() => setPrintSided('single')}
              >
                Single-Sided
              </button>
              <button 
                className={`option-button ${printSided === 'double' ? 'active' : ''}`} 
                onClick={() => setPrintSided('double')}
              >
                Double-Sided
              </button>
            </div>
          </div>
          
          <div className="option-group">
            <label>Print Options</label>
            <div className="color-options">
              <button 
                className={`option-button ${printOption === 'black' ? 'active' : ''}`} 
                onClick={() => setPrintOption('black')}
              >
                Black & White
              </button>
              <button 
                className={`option-button ${printOption === 'color' ? 'active' : ''}`} 
                onClick={() => setPrintOption('color')}
              >
                Color
              </button>
            </div>
          </div>
          
          {/* New Comments Section */}
          <div className="option-group comments-section">
            <label>Special Instructions</label>
            <textarea
              className="comments-input"
              placeholder="Add any special instructions for your print job (e.g., specific pages to print, binding preferences, etc.)"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={4}
            />
          </div>
        </div>
        
        <div className="price-display">
          <h3>Total Price: ₹{totalPrice.toFixed(2)}</h3>
          <p className="price-details">
            {printOption === 'black' ? 'B&W: ₹1/page' : 'Color: ₹12/page'} | 
            {files.length} file(s) | {copies} copies | {printSided}-sided
          </p>
        </div>
        
        <button 
          className="print-button"
          onClick={handlePrint}
          disabled={files.length === 0 || uploading}
        >
          {uploading ? 'Uploading...' : `Print (₹${totalPrice.toFixed(2)})`}
        </button>
      </div>
    </div>
  );
};

// Payment Component
const Payment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [upiId, setUpiId] = useState('');
  const [processing, setProcessing] = useState(false);
  const { darkMode } = React.useContext(ThemeContext);
  const { currentUser } = React.useContext(AuthContext);
  
  // Get total price from location state or use default
  const totalPrice = location.state?.totalPrice || 0;
  const printDetails = location.state?.printDetails || {};

  const generateTokenNumber = async () => {
    try {
      // Get the last token number from a special document in Firestore
      const tokenCounterRef = doc(db, 'system', 'tokenCounter');
      const tokenDoc = await getDoc(tokenCounterRef);
      
      let nextTokenNumber = 1; // Default starting number
      
      if (tokenDoc.exists()) {
        nextTokenNumber = tokenDoc.data().currentToken + 1;
      }
      
      // Format the token number with leading zeros (PR001, PR002, etc)
      const formattedToken = `PR${nextTokenNumber.toString().padStart(3, '0')}`;
      
      // Update the token counter in Firestore
      await setDoc(tokenCounterRef, { currentToken: nextTokenNumber });
      
      return formattedToken;
    } catch (error) {
      console.error("Error generating token:", error);
      // Fallback to timestamp-based token if counter fails
      const timestamp = new Date().getTime();
      return `PR${timestamp.toString().slice(-5)}`;
    }
  };

  const handlePayment = async () => {
    if (paymentMethod) {
      setProcessing(true);
      
      try {
        // Generate a unique token number
        const tokenNumber = await generateTokenNumber();
        
        // Create a new print request in Firestore
        const printRequestRef = await addDoc(collection(db, 'printRequests'), {
          studentEmail: currentUser.email,
          studentId: currentUser.uid,
          fileDetails: printDetails.files && printDetails.files.length > 0 ? printDetails.files[0] : 'Untitled Document',
          fileURLs: printDetails.fileURLs || [],
          copies: printDetails.copies || 1,
          printOption: printDetails.printOption || 'black',
          printSided: printDetails.printSided || 'single',
          pageCount: printDetails.pageCount || 1,
          comments: printDetails.comments || '', // Store comments in the print request
          totalPrice: totalPrice,
          paymentMethod: paymentMethod,
          paymentDetails: paymentMethod === 'upi' ? { upiId } : null,
          status: 'pending',
          timestamp: serverTimestamp(),
          tokenNumber: tokenNumber, // Add token number to the document
        });
        
        // Navigate to status page with request ID and token
        navigate('/status', { 
          state: { 
            requestId: printRequestRef.id,
            totalPrice,
            printDetails,
            paymentMethod,
            paymentDetails: paymentMethod === 'upi' ? { upiId } : null,
            tokenNumber: tokenNumber // Pass token to status page
          } 
        });
      } catch (error) {
        console.error("Error processing payment:", error);
        alert("Error processing payment. Please try again.");
      } finally {
        setProcessing(false);
      }
    }
  };
  return (
    <div className={`payment-container ${darkMode ? 'dark-theme' : ''}`}>
      <div className="header">
        <div className="back-button" onClick={() => navigate('/print')}>←</div>
        <h2>Payment</h2>
      </div>
      <div className="payment-content">
        <h3>Pay ₹{totalPrice.toFixed(2)}</h3>
        <h4>Choose a payment method</h4>
        
        <div className="payment-methods">
          <div 
            className={`payment-method ${paymentMethod === 'upi' ? 'selected' : ''}`}
            onClick={() => setPaymentMethod('upi')}
          >
            <div className="payment-icon upi-icon"></div>
            <span>UPI</span>
          </div>
          
          <div 
            className={`payment-method ${paymentMethod === 'card' ? 'selected' : ''}`}
            onClick={() => setPaymentMethod('card')}
          >
            <div className="payment-icon card-icon"></div>
            <span>Card</span>
          </div>
          
          <div 
            className={`payment-method ${paymentMethod === 'netbanking' ? 'selected' : ''}`}
            onClick={() => setPaymentMethod('netbanking')}
          >
            <div className="payment-icon netbanking-icon"></div>
            <span>Netbanking</span>
          </div>
        </div>
        
        <div className="payment-details">
          {paymentMethod === 'upi' && (
            <div className="upi-options">
              <div className="payment-option">
                <div className="payment-logo google-pay"></div>
                <span>Google Pay</span>
                <div className="check-icon">✓</div>
              </div>
              
              <div className="upi-input-section">
                <label htmlFor="upi-id">Enter UPI ID:</label>
                <input
                  id="upi-id"
                  type="text"
                  placeholder="yourname@upi"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  required
                />
                <small>Format: username@bankname</small>
              </div>
            </div>
          )}
          
          {paymentMethod === 'card' && (
            <div className="card-options">
              <div className="payment-option">
                <div className="payment-logo card"></div>
                <span>Credit/Debit Card</span>
                <div className="check-icon">✓</div>
              </div>
            </div>
          )}
          
          {paymentMethod === 'netbanking' && (
            <div className="netbanking-options">
              <div className="payment-option">
                <div className="payment-logo netbanking"></div>
                <span>Net Banking</span>
                <div className="check-icon">✓</div>
              </div>
            </div>
          )}
        </div>
        
        <button 
          className="continue-button"
          onClick={handlePayment}
          disabled={!paymentMethod || (paymentMethod === 'upi' && !upiId) || processing}
        >
          {processing ? 'Processing...' : `Pay ₹${totalPrice.toFixed(2)}`}
        </button>
      </div>
    </div>
  );
};

const Status = () => {
  const [requestStatus, setRequestStatus] = useState('pending');
  const [printRequest, setPrintRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { darkMode } = React.useContext(ThemeContext);
  const { currentUser } = React.useContext(AuthContext);
  const requestId = location.state?.requestId;

  useEffect(() => {
    let unsubscribe = () => {};
    
    const setupRealTimeUpdates = async () => {
      if (requestId) {
        try {
          setLoading(true);
          
          // Set up real-time listener to the print request document
          const docRef = doc(db, 'printRequests', requestId);
          unsubscribe = onSnapshot(docRef, (docSnapshot) => {
            if (docSnapshot.exists()) {
              const data = docSnapshot.data();
              setPrintRequest(data);
              setRequestStatus(data.status || 'pending');
            } else {
              console.error("Print request not found");
            }
            setLoading(false);
          }, (error) => {
            console.error("Error listening to print request updates:", error);
            setLoading(false);
          });
          
        } catch (error) {
          console.error("Error setting up real-time updates:", error);
          setLoading(false);
        }
      } else if (location.state) {
        // Use the data passed through navigation if available
        setPrintRequest(location.state);
        setRequestStatus(location.state.status || 'pending');
        setLoading(false);
      } else {
        setLoading(false);
      }
    };

    setupRealTimeUpdates();
    
    // Clean up the listener when component unmounts
    return () => unsubscribe();
  }, [requestId, location.state]);

  // Status message mapping
  const getStatusMessage = (status) => {
    switch(status) {
      case 'pending':
        return 'Your print request has been received and is awaiting processing.';
      case 'queue':
        return 'Your print request is in queue. It will be processed soon.';
      case 'printing':
        return 'Your document is being printed. This may take a few minutes.';
      case 'completed':
        return 'Your print job is complete! You can pick it up at the print center.';
      case 'failed':
        return 'There was an issue with your print job. Please contact support.';
      case 'cancelled':
        return 'This print request has been cancelled.';
      default:
        return 'Status update in progress.';
    }
  };

  // Status title mapping
  const getStatusTitle = (status) => {
    switch(status) {
      case 'pending':
        return 'Order Received';
      case 'queue':
        return 'In Queue';
      case 'printing':
        return 'Printing in Progress';
      case 'completed':
        return 'Print Completed';
      case 'failed':
        return 'Print Failed';
      case 'cancelled':
        return 'Print Cancelled';
      default:
        return 'Processing';
    }
  };

  return (
    <div className={`status-container ${darkMode ? 'dark-theme' : ''}`}>
      <div className="header">
        <div className="back-button" onClick={() => navigate('/home')}>←</div>
        <h2>Print Status</h2>
      </div>
      <div className="status-content">
        {loading ? (
          <div className="loading-indicator">
            <p>Loading status...</p>
          </div>
        ) : (
          <>
            <div className={`status-icon ${requestStatus}`}></div>
            
            {/* Display token number prominently */}
            {(printRequest?.tokenNumber || location.state?.tokenNumber) && (
              <div className="token-number">
                <h3>Your Token Number</h3>
                <div className="token-display">
                  {printRequest?.tokenNumber || location.state?.tokenNumber}
                </div>
                <p className="token-message">Please show this token when collecting your prints</p>
              </div>
            )}
            
            <h3 className="status-title">
              {getStatusTitle(requestStatus)}
            </h3>
            
            <p className="status-message">
              {getStatusMessage(requestStatus)}
            </p>
            
            {printRequest && (
              <div className="order-details">
                <h4>Order Details</h4>
                <p><strong>Files:</strong> {printRequest.fileDetails || (printRequest.printDetails?.files?.join(', ') || 'Document')}</p>
                <p><strong>Copies:</strong> {printRequest.copies || printRequest.printDetails?.copies || 1}</p>
                <p><strong>Print Option:</strong> {(printRequest.printOption || printRequest.printDetails?.printOption) === 'black' ? 'Black & White' : 'Color'}</p>
                <p><strong>Print Sided:</strong> {(printRequest.printSided || printRequest.printDetails?.printSided) === 'single' ? 'Single-Sided' : 'Double-Sided'}</p>
                
                {/* Display comments if they exist */}
                {(printRequest.comments || printRequest.printDetails?.comments) && (
                  <p><strong>Special Instructions:</strong> {printRequest.comments || printRequest.printDetails?.comments}</p>
                )}
                
                <p><strong>Total Price:</strong> ₹{printRequest.totalPrice?.toFixed(2) || '0.00'}</p>
                <p><strong>Token Number:</strong> {printRequest.tokenNumber || location.state?.tokenNumber || 'Not assigned'}</p>
                <p><strong>Requested:</strong> {printRequest.timestamp?.toDate().toLocaleString() || 'Unknown'}</p>
              </div>
            )}
            
            <button 
              className="home-button"
              onClick={() => navigate('/home')}
            >
              Back to Home
            </button>
          </>
        )}
      </div>
    </div>
  );
};

// Profile Component
const Profile = () => {
  const navigate = useNavigate();
  const { darkMode, toggleTheme } = React.useContext(ThemeContext);
  const { currentUser, logout, userProfile } = React.useContext(AuthContext);
  const [printHistory, setPrintHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPrintHistory = async () => {
      if (currentUser) {
        try {
          const q = query(
            collection(db, 'printRequests'),
            where('studentId', '==', currentUser.uid)
          );
          
          const querySnapshot = await getDocs(q);
          const history = [];
          
          querySnapshot.forEach((doc) => {
            history.push({
              id: doc.id,
              ...doc.data()
            });
          });
          
          // Sort by timestamp descending
          history.sort((a, b) => b.timestamp?.toDate() - a.timestamp?.toDate());
          
          setPrintHistory(history);
        } catch (error) {
          console.error("Error fetching print history:", error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchPrintHistory();
  }, [currentUser]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  return (
    <div className={`profile-container ${darkMode ? 'dark-theme' : ''}`}>
      <div className="header">
        <h2>Profile</h2>
        <div className="theme-toggle" onClick={toggleTheme}>
        </div>
      </div>
      <div className="profile-content">
        {/* Added margin-bottom for spacing */}
        <div className="profile-card" style={{ marginBottom: '2rem' }}>
          <div className="profile-avatar"></div>
          <h3>{currentUser?.email}</h3>
          <button className="logout-button" onClick={handleLogout}>
            Logout
          </button>
        </div>
        
        {/* Added margin-top for spacing */}
        <div className="print-history" style={{ marginTop: '2rem' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>Print History</h3>
          
          {loading ? (
            <p>Loading print history...</p>
          ) : printHistory.length > 0 ? (
            <div className="history-list">
              {printHistory.map((item) => (
                <div 
                  key={item.id} 
                  className="history-item" 
                  style={{ 
                    marginBottom: '1.5rem', 
                    display: 'flex',
                    justifyContent: 'flex-start', // Align to the left
                    padding: '1rem',
                    borderRadius: '8px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}
                >
                  <div className="history-details" style={{ textAlign: 'left' }}>
                    <h4 style={{ marginTop: 0, marginBottom: '0.5rem' }}>{item.fileDetails || 'Document'}</h4>
                    <p style={{ margin: '0.5rem 0' }}>Date: {item.timestamp?.toDate().toLocaleDateString() || 'N/A'}</p>
                    <p style={{ margin: '0.5rem 0' }}>Status: {item.status}</p>
                    {item.tokenNumber && <p style={{ margin: '0.5rem 0' }}>Token: {item.tokenNumber}</p>}
                  </div>
                  <div className="history-price" style={{ 
                    marginLeft: 'auto', 
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center' 
                  }}>
                    ₹{item.totalPrice?.toFixed(2) || '0.00'}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p>No print history found.</p>
          )}
        </div>
      </div>
      <div className="nav-bar">
        <div className="nav-item" onClick={() => navigate('/home')}>
          <div className="nav-icon home-icon"></div>
          <span>Home</span>
        </div>
        <div className="nav-item active">
          <div className="nav-icon profile-icon"></div>
          <span>Profile</span>
        </div>
      </div>
    </div>
  );
};

// Private Route Component
const PrivateRoute = ({ children }) => {
  const { currentUser } = React.useContext(AuthContext);
  const location = useLocation();
  
  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  return children;
};

// Register Component
const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { darkMode } = React.useContext(ThemeContext);
  const { register } = React.useContext(AuthContext);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    try {
      await register(email, password);
      navigate('/home');
    } catch (error) {
      console.error("Registration error:", error);
      setError(error.message || 'Failed to register. Please try again.');
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className={`login-container ${darkMode ? 'dark-theme' : ''}`}>
      <div className="login-card">
        <div className="profile-icon">
          <div className="avatar"></div>
        </div>
        <h2>Create Account</h2>
        {error && <p className="error-message">{error}</p>}
        <form onSubmit={handleRegister}>
          <div className="input-group">
            <input 
              type="email" 
              placeholder="Email Address" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="input-group">
            <input 
              type={showPassword ? "text" : "password"}
              placeholder="Password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <span 
              className="password-toggle" 
              onClick={togglePasswordVisibility}
            >
              {showPassword ? '👁️‍🗨️' : '👁️'}
            </span>
          </div>
          <div className="input-group">
            <input 
              type={showPassword ? "text" : "password"}
              placeholder="Confirm Password" 
              value={confirmPassword} 
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="login-button">Register</button>
        </form>
        <p className="auth-link">
          Already have an account? <span onClick={() => navigate('/login')}>Login</span>
        </p>
      </div>
    </div>
  );
};

// App Component
function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/home" element={
              <PrivateRoute>
                <Home />
              </PrivateRoute>
            } />
            <Route path="/print" element={
              <PrivateRoute>
                <Print />
              </PrivateRoute>
            } />
            <Route path="/payment" element={
              <PrivateRoute>
                <Payment />
              </PrivateRoute>
            } />
            <Route path="/status" element={
              <PrivateRoute>
                <Status />
              </PrivateRoute>
            } />
            <Route path="/profile" element={
              <PrivateRoute>
                <Profile />
              </PrivateRoute>
            } />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;