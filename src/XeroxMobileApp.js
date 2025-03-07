import React, { useState } from 'react';
import { Camera, Upload, FileText, Clock, Check } from 'lucide-react';
import './App.css'; // Import the CSS file

const XeroxMobileApp = () => {
  const [currentScreen, setCurrentScreen] = useState('login');
  const [userDetails, setUserDetails] = useState({
    studentId: '',
    name: ''
  });
  const [printRequest, setPrintRequest] = useState({
    copies: 1,
    isColor: false,
    paperSize: 'A4',
    status: ''
  });
  const [uploadedFile, setUploadedFile] = useState(null); // New state to store the uploaded file
  const [tokenNumber, setTokenNumber] = useState(1); // State to track the current token number

  // Handle file upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadedFile(file);
    }
  };

  // Increment the token number when a user submits a request
  const submitPrintRequest = () => {
    setTokenNumber((prevToken) => prevToken + 1); // Increment token number
    setCurrentScreen('confirmation'); // Switch to confirmation screen
  };

  const LoginScreen = () => (
    <div className="login-container">
      <h2 className="title">Xerox Center Login</h2>
      <div className="input-group">
        <label className="label">Register ID</label>
        <input
          type="text"
          className="input"
          placeholder="Enter your college ID"
          value={userDetails.studentId}
          onChange={(e) => setUserDetails({ ...userDetails, studentId: e.target.value })}
        />
      </div>
      <div className="input-group">
        <label className="label">Name</label>
        <input
          type="text"
          className="input"
          placeholder="Enter your name"
          value={userDetails.name}
          onChange={(e) => setUserDetails({ ...userDetails, name: e.target.value })}
        />
      </div>
      <button className="submit-button" onClick={() => setCurrentScreen('upload')}>
        Login
      </button>
    </div>
  );

  const UploadScreen = () => (
    <div className="upload-container">
      <h2 className="title">Upload Document</h2>
      <div className="file-upload">
        <Upload className="upload-icon" size={48} />
        <p className="upload-text">Click to upload or drag and drop</p>
        <input
          type="file"
          accept="application/pdf" // Only allow PDF uploads
          className="file-input"
          onChange={handleFileUpload}
        />
      </div>

      {uploadedFile && (
        <div className="file-info">
          <p><strong>Selected File:</strong> {uploadedFile.name}</p>
          <p><strong>Size:</strong> {(uploadedFile.size / 1024).toFixed(2)} KB</p>
        </div>
      )}

      <div className="input-group">
        <label className="label">Number of Copies</label>
        <input
          type="number"
          className="input"
          min="1"
          value={printRequest.copies}
          onChange={(e) => setPrintRequest({ ...printRequest, copies: e.target.value })}
        />
      </div>
      <div className="checkbox-group">
        <label className="label">
          <input
            type="checkbox"
            checked={printRequest.isColor}
            onChange={(e) => setPrintRequest({ ...printRequest, isColor: e.target.checked })}
          />
          Color Print
        </label>
      </div>
      <button className="submit-button" onClick={submitPrintRequest}>
        Submit Print Request
      </button>
    </div>
  );

  const ConfirmationScreen = () => (
    <div className="confirmation-container">
      <div className="confirmation-message">
        <div className="confirmation-icon">
          <Check className="check-icon" size={32} />
        </div>
        <h2 className="title">Request Submitted!</h2>
        <p className="token-number">Your token number: #{tokenNumber}</p>
      </div>
      <div className="print-details">
        <h3>Print Details:</h3>
        <p>Copies: {printRequest.copies}</p>
        <p>Type: {printRequest.isColor ? 'Color' : 'Black & White'}</p>
        <p>Status: Pending</p>
      </div>
      <button className="submit-button" onClick={() => setCurrentScreen('upload')}>
        New Print Request
      </button>
    </div>
  );

  return (
    <div className="app-container">
      {currentScreen === 'login' && <LoginScreen />}
      {currentScreen === 'upload' && <UploadScreen />}
      {currentScreen === 'confirmation' && <ConfirmationScreen />}
    </div>
  );
};

export default XeroxMobileApp;
