import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

const CustomerLogin = () => {
  const { login, loading } = useContext(AuthContext); // removed error: authError
  const [form, setForm] = useState({ email: '', password: '' });
  const [localError, setLocalError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm(prevForm => ({ ...prevForm, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');

    if (!form.email || !form.password) {
      setLocalError('Email and password are required.');
      return;
    }

    try {
      await login({ email: form.email, password: form.password });
      navigate('/customer');
    } catch (err) {
      setLocalError(err.message || 'Login failed. Please check your credentials.');
    }
  };

  return (
    <div className="auth-form-root">
     
      <form className="auth-form" onSubmit={handleSubmit}>
        <input
          name="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
          style={{
            border: '1px solid #003087',
            marginBottom: 14,
            borderRadius: 8,
            padding: 10,
            fontSize: 16
          }}
        />
        <input
          name="password"
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={handleChange}
          style={{
            border: '1px solid #003087',
            marginBottom: 14,
            borderRadius: 8,
            padding: 10,
            fontSize: 16
          }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            background: '#003087',
            color: '#fff',
            border: 'none',
            borderRadius: 22,
            padding: '10px 0',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: 'pointer',
            marginBottom: 8
          }}
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
        {localError && (
          <div className="auth-error" style={{ color: 'red', marginTop: 8 }}>
            {localError}
          </div>
        )}
      </form>
      <div style={{ marginTop: 12, textAlign: 'center' }}>
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
          Sign Up
        </button>
        <button
          onClick={() => navigate('/admin-login')}
          style={{
            background: 'none',
            color: '#003087',
            border: 'none',
            fontWeight: 600,
            fontSize: '1rem',
            cursor: 'pointer'
          }}
        >
          Admin Login
        </button>
      </div>
    </div>
  );
};

export default CustomerLogin;