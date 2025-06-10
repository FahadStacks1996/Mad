import React, { createContext, useState, useEffect, useCallback } from 'react';

export const AuthContext = React.createContext();

const API_URL = 'http://localhost:5001/api/auth'; // Backend Auth API URL

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('token') || '');
  const [loading, setLoading] = useState(false); // To track API call status
  const [error, setError] = useState(null); // To store API call errors

  // Restore user/token from localStorage on mount (for page refresh)
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');
    if (storedUser) setUser(JSON.parse(storedUser));
    if (storedToken) setToken(storedToken);
  }, []);

  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }, [user, token]);

  const login = useCallback(async (credentials) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }
      setUser(data.user);
      setToken(data.token);
      return data; // Return data for potential further actions in component
    } catch (err) {
      console.error("Login failed:", err);
      setError(err.message);
      // Ensure user and token are cleared on failed login attempt if they were somehow set
      setUser(null);
      setToken(null);
      throw err; // Re-throw to be caught by calling component
    } finally {
      setLoading(false);
    }
  }, []);

  const signup = async (signupData) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('http://localhost:5001/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signupData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Signup failed');
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    // No API call needed for simple token-based logout on client-side
    // If backend had session invalidation, you'd call it here.
  }, []);

  // Optional: Function to verify token or fetch user data if token exists but user data is lost (e.g., on page refresh)
  // This is more advanced and might be needed if you only store the token and fetch user on app load.
  // For now, we rely on both user and token being in localStorage.

  return (
    <AuthContext.Provider value={{
      user, setUser,
      token, setToken,
      login, logout,
      signup, // <-- THIS MUST BE INCLUDED
      loading, error,
    }}>
      {children}
    </AuthContext.Provider>
  );
};