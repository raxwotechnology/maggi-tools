import React, { useState } from 'react';
import api from '../services/api';
import { ArrowLeft, User, Lock, Loader2, ShieldCheck, Wrench } from 'lucide-react';
import './Login.css';

const TOOL_BRAND_IMAGE = 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?q=80&w=800&auto=format&fit=crop';

const Login = ({ onLoginSuccess, roleContext, onBack, appSettings }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/auth/login', { username, password });
      if (res.data && res.data.token) {
        localStorage.setItem('raxwo_auth_token', res.data.token);
        localStorage.setItem('raxwo_user_role', res.data.user.role);
        localStorage.setItem('raxwo_user_name', res.data.user.name);
        onLoginSuccess();
      }
    } catch (err) {
      const serverMsg = err.response?.data?.message || '';
      const isNetworkError = !err.response;
      const isServerLoginError = serverMsg.toLowerCase().includes('server error during login');
      const isTimeout = err.code === 'ECONNABORTED';

      if (isNetworkError || isTimeout) {
        setError(
          'Cannot reach the server. If you are on localhost, run the backend (npm start in backend folder on port 5001). On the live site, wait a moment and try again.'
        );
      } else if (isServerLoginError) {
        setError('Database is temporarily unavailable. Try emergency login: admin / admin@123');
      } else {
        setError(serverMsg || 'Sign in failed. Please check your username and password.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="premium-auth-layout">
      <div className="auth-visual-side" style={{ 
        backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.82), rgba(15, 23, 42, 0.55)), url('${TOOL_BRAND_IMAGE}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}>
        <div className="visual-overlay" style={{ display: 'none' }}></div>
        <div className="visual-content">
          <div className="tool-brand-mark" aria-hidden="true">
            <img src={TOOL_BRAND_IMAGE} alt="" className="tool-brand-photo" />
            <div className="tool-brand-icon"><Wrench size={28} /></div>
          </div>
          <h1>{appSettings?.companyName || 'Professional'} <br /><span>Inventory.</span></h1>
          <p>Professional Tool Rental & Management Solutions for modern industries.</p>
        </div>
      </div>
      
      <div className="auth-form-side">
        <div className="auth-card">
          <button className="auth-back-btn" onClick={onBack}>
            <ArrowLeft size={18} />
            <span>Go Back</span>
          </button>
          
          <div className="auth-header">
            <div className="role-pill">
              <ShieldCheck size={14} />
              <span>{roleContext} Access</span>
            </div>
            <h2>Welcome Back</h2>
            <p>Securely sign in to your {roleContext.toLowerCase()} portal.</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {error && <div className="auth-error-banner">{error}</div>}

            <div className="auth-input-group">
              <label>Username</label>
              <div className="auth-input-wrapper">
                <User size={20} className="auth-icon" />
                <input 
                  type="text" 
                  value={username} 
                  onChange={e => setUsername(e.target.value)} 
                  placeholder="Enter your username"
                  required 
                />
              </div>
            </div>

            <div className="auth-input-group">
              <label>Password</label>
              <div className="auth-input-wrapper">
                <Lock size={20} className="auth-icon" />
                <input 
                  type="password" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  placeholder="••••••••"
                  required 
                />
              </div>
            </div>

            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="spinner" size={20} />
                  <span>Authenticating...</span>
                </>
              ) : (
                <span>Sign In to Portal</span>
              )}
            </button>
          </form>

          <div className="auth-footer">
            <p>© 2026 {appSettings?.companyName || 'RAXWO Tool Rentals'}. Professional Equipment Ecosystem.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
