import React, { useEffect, useState, useContext, useCallback } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import './riderManagement.css';

const API_RIDERS_URL = 'http://localhost:5001/api/riders';

const statusColors = {
  Available: 'available',
  'On Order': 'onorder',
  'Day Off': 'dayoff'
};

const RiderManagement = () => {
  const { token } = useContext(AuthContext);
  const [riders, setRiders] = useState([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [bikeNumber, setBikeNumber] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const fetchRiders = useCallback(async () => {
    try {
      const res = await fetch(API_RIDERS_URL, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        setRiders([]);
        setError('Failed to fetch riders. Are you logged in as admin?');
        return;
      }
      const data = await res.json();
      setRiders(data);
      setError('');
    } catch (err) {
      setError('Error fetching riders');
      setRiders([]);
    }
  }, [token]);

  useEffect(() => { fetchRiders(); }, [fetchRiders]);

  const addRider = async () => {
    try {
      const res = await fetch(API_RIDERS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name, phone, bikeNumber, username, password })
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.message || 'Failed to add rider');
        return;
      }
      setName(''); setPhone(''); setBikeNumber(''); setUsername(''); setPassword('');
      setError('');
      fetchRiders();
    } catch (err) {
      setError('Error adding rider');
    }
  };

  // Only show riders who are not on Day Off as available
  const getStatusLabel = (r) => {
    if (r.status === 'Day Off' || !r.isAvailable) return 'Unavailable';
    if (r.status === 'Available' && r.isAvailable) return 'Available';
    return r.status;
  };

  return (
    <div className="rider-management-root">
      <div className="rider-management-card">
        <h2>Rider Management</h2>
        <form className="rider-form" onSubmit={e => { e.preventDefault(); addRider(); }}>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Rider Name"
            required
          />
          <input
            type="text"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="Phone"
            required
          />
          <input
            type="text"
            value={bikeNumber}
            onChange={e => setBikeNumber(e.target.value)}
            placeholder="Bike Number"
            required
          />
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="Username (for rider login)"
            required
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password (for rider login)"
            required
          />
          <button type="submit">Add Rider</button>
        </form>
        {error && <div style={{ color: 'red', marginBottom: 10 }}>{error}</div>}
        <ul className="rider-list">
          {riders.length === 0 && (
            <li style={{ color: '#888', textAlign: 'center', width: '100%' }}>
              No riders found. Add a rider to get started.
            </li>
          )}
          {riders.map(r => (
            <li key={r._id}>
              <div>
                <span className="rider-name">{r.name}</span>
                <span className="rider-bike"> | Bike: {r.bikeNumber}</span>
                <span className="rider-phone"> | {r.phone}</span>
                <span className="rider-username"> | Username: {r.username || '-'}</span>
              </div>
              <span className={`rider-status ${statusColors[r.status] || 'available'}`}>
                {getStatusLabel(r)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default RiderManagement;