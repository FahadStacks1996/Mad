import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

const API_URL = 'http://localhost:5001/api/auth/login';

const AdminLogin = ({ onRiderLogin }) => {
  const { setUser, setToken, login } = useContext(AuthContext);
  const [form, setForm] = useState({ username: '', password: '' });
  const [localError, setLocalError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    setLoading(true);

    // Trim and lowercase input if it looks like an email
    let inputValue = form.username.trim();
    if (inputValue.includes('@')) inputValue = inputValue.toLowerCase();

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: inputValue,
          email: inputValue,
          password: form.password
        }),
      });
      const data = await res.json();
      setLoading(false);

      if (!res.ok) throw new Error(data.message);

      if (data.type === 'admin') {
        setUser(data.user);
        setToken(data.token);
        navigate('/home');
      } else if (data.type === 'rider') {
        localStorage.setItem('riderToken', data.token);
        localStorage.setItem('rider', JSON.stringify(data.rider));
        if (onRiderLogin) onRiderLogin(data.token, data.rider);
        navigate('/rider-dashboard');
      } else if (data.type === 'customer') {
        setUser(data.user);
        setToken(data.token);
        navigate('/customer');
      } else {
        setLocalError('Invalid credentials.');
      }
    } catch (err) {
      setLoading(false);
      setLocalError(err.message || 'Login failed. Please check your credentials.');
    }
  };

  return (
    <div className="auth-form-root" style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '80vh',
      padding: '20px',
      boxSizing: 'border-box'
    }}>
      <div style={{
        background: '#fff',
        padding: '30px',
        borderRadius: '12px',
        boxShadow: '0 8px 20px rgba(0,0,0,0.1)',
        width: '100%',
        maxWidth: '400px',
        textAlign: 'center'
      }}>
        <img
          src="/Images/madpizzalogo.png"
          alt="Mad Pizza Logo"
          style={{ height: 70, marginBottom: 15 }}
        />
        <h2 style={{ color: '#d32f2f', margin: '0 0 20px 0', fontWeight: 'bold' }}>Login</h2>
        <form className="auth-form" onSubmit={handleSubmit} style={{ width: '100%' }}>
          <input
            name="username"
            placeholder="Username or Email"
            value={form.username}
            onChange={handleChange}
            style={{
              width: '100%',
              border: '1px solid #ccc',
              marginBottom: 15,
              borderRadius: 8,
              padding: '12px 15px',
              fontSize: 16,
              boxSizing: 'border-box'
            }}
            required
          />
          <input
            name="password"
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            style={{
              width: '100%',
              border: '1px solid #ccc',
              marginBottom: 20,
              borderRadius: 8,
              padding: '12px 15px',
              fontSize: 16,
              boxSizing: 'border-box'
            }}
            required
          />
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              background: '#d32f2f',
              color: '#fff',
              border: 'none',
              borderRadius: 22,
              padding: '12px 0',
              fontSize: '1.1rem',
              fontWeight: 600,
              cursor: 'pointer',
              marginBottom: 15
            }}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
          {localError && (
            <div className="auth-error" style={{ color: 'red', marginBottom: 10, fontSize: '0.9rem' }}>
              {localError}
            </div>
          )}
        </form>
        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <button
            onClick={() => navigate('/signup')}
            style={{
              background: '#ffc107',
              color: '#333',
              border: 'none',
              borderRadius: 22,
              padding: '8px 22px',
              fontWeight: 600,
              fontSize: '1rem',
              cursor: 'pointer',
              marginRight: 8
            }}
          >
            Signup
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;