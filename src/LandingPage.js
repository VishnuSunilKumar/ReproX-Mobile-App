import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './App.css';

const LandingPage = () => {
  const navigate = useNavigate();
  const [animationComplete, setAnimationComplete] = useState(false);
  
  useEffect(() => {
    // Redirect to login page after animation completes
    const timer = setTimeout(() => {
      setAnimationComplete(true);
      setTimeout(() => {
        navigate('/App');
      }, 500); // Short delay after fade-out animation starts
    }, 3000); // 3 seconds for the animation to play
    
    return () => clearTimeout(timer);
  }, [navigate]);
  
  return (
    <div className={`landing-container ${animationComplete ? 'fade-out' : ''}`}>
      <div className="logo-container">
        <img 
          src="/logo.png" 
          alt="Xerox Logo" 
          className="landing-logo animate-pulse"
        />
      </div>
      <h1 className="landing-title animate-slide-up">XEROX</h1>
    </div>
  );
};

export default LandingPage;