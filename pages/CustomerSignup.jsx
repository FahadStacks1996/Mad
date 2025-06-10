import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

const CustomerSignup = () => {
  const { signup, loading, error: authError } = useContext(AuthContext);
  const [form, setForm] = useState({ name: '', email: '', password: '', address: '' });
  const [localError, setLocalError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm(prevForm => ({ ...prevForm, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');

    if (!form.name || !form.email || !form.password) {
      setLocalError('Name, email, and password are required.');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(form.email)) {
      setLocalError('Please enter a valid email address.');
      return;
    }
    if (form.password.length < 6) {
      setLocalError('Password must be at least 6 characters long.');
      return;
    }

    try {
      const signupData = {
        email: form.email,
        password: form.password,
        role: 'customer',
        firstName: form.name,
        address: form.address
      };
      const data = await signup(signupData);
      if (data && data.user) {
        navigate('/admin-login'); // Redirect to login after signup
      } else {
        setLocalError("Signup completed but no user data returned. Please try logging in.");
      }
    } catch (err) {
      setLocalError(err.message || 'Signup failed');
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
        maxWidth: '450px',
        textAlign: 'center'
      }}>
        <img
          src="/Images/madpizzalogo.png"
          alt="Mad Pizza Logo"
          style={{ height: 70, marginBottom: 15 }}
        />
        <h2 style={{ color: '#d32f2f', margin: '0 0 20px 0', fontWeight: 'bold' }}>Customer Sign Up</h2>
        <form className="auth-form" onSubmit={handleSubmit} style={{ width: '100%' }}>
          <input
            name="name"
            placeholder="Full Name"
            value={form.name}
            onChange={handleChange}
            required
            style={{
              width: '100%', border: '1px solid #ccc', marginBottom: 15, borderRadius: 8,
              padding: '12px 15px', fontSize: 16, boxSizing: 'border-box'
            }}
          />
          <input
            name="email"
            type="email"
            placeholder="Email (will be your username)"
            value={form.email}
            onChange={handleChange}
            required
            style={{
              width: '100%', border: '1px solid #ccc', marginBottom: 15, borderRadius: 8,
              padding: '12px 15px', fontSize: 16, boxSizing: 'border-box'
            }}
          />
          <input
            name="password"
            type="password"
            placeholder="Password (min. 6 characters)"
            value={form.password}
            onChange={handleChange}
            required
            style={{
              width: '100%', border: '1px solid #ccc', marginBottom: 15, borderRadius: 8,
              padding: '12px 15px', fontSize: 16, boxSizing: 'border-box'
            }}
          />
          <input
            name="address"
            placeholder="Address (Optional for now)"
            value={form.address}
            onChange={handleChange}
            style={{
              width: '100%', border: '1px solid #ccc', marginBottom: 20, borderRadius: 8,
              padding: '12px 15px', fontSize: 16, boxSizing: 'border-box'
            }}
          />
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', background: '#d32f2f', color: '#fff', border: 'none',
              borderRadius: 25, padding: '12px 0', fontSize: '1.1rem', fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer', marginBottom: 15, transition: 'background-color 0.3s ease'
            }}
            onMouseOver={e => e.currentTarget.style.backgroundColor = loading ? '#d32f2f' : '#b71c1c'}
            onMouseOut={e => e.currentTarget.style.backgroundColor = '#d32f2f'}
          >
            {loading ? 'Signing up...' : 'Sign Up'}
          </button>
          {(authError || localError) && (
            <div className="auth-error" style={{ color: 'red', marginBottom: 10, fontSize: '0.9rem' }}>
              {authError || localError}
            </div>
          )}
        </form>
        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <p style={{fontSize: '0.9rem', color: '#555'}}>Already have an account?</p>
          <button
            onClick={() => navigate('/admin-login')}
            style={{
              background: 'none', color: '#d32f2f', border: 'none', fontWeight: 600, fontSize: '1rem', cursor: 'pointer'
            }}
          >
            Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomerSignup;