import React, { useEffect, useState } from 'react';

const API_URL = 'http://localhost:5001/api/rider/orders';
const API_MARK_DELIVERED = id => `http://localhost:5001/api/rider/orders/${id}/delivered`;
const API_RIDER_STATUS = 'http://localhost:5001/api/rider/status';
const MAD_PIZZA_ADDRESS = 'Plot C, 33, Block 2 Clifton, Karachi, Pakistan';

function getActualTimeTaken(order) {
  if (
    order.status === 'Completed' &&
    order.riderAssignedAt &&
    order.updatedAt
  ) {
    const start = new Date(order.riderAssignedAt);
    const end = new Date(order.updatedAt);
    const diffMs = end - start;
    return (diffMs / 60000).toFixed(1); // minutes
  }
  return null;
}

function isSameDay(dateA, dateB) {
  const a = new Date(dateA);
  const b = new Date(dateB);
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function RiderDashboard({ token, rider, onRiderLogout }) {
  const [orders, setOrders] = useState([]);
  const [err, setErr] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [riderStatus, setRiderStatus] = useState(rider.status || 'Available');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filteredOrders, setFilteredOrders] = useState([]);

  useEffect(() => {
    if (!token) return;
    fetch(API_URL, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setOrders(data))
      .catch(() => setErr('Failed to load orders'));
  }, [token, statusMsg]);

  // Filter logic
  useEffect(() => {
    let temp = [...orders];
    // Default: show today's orders
    if (!filterStartDate && !filterEndDate && !filterStatus) {
      const today = new Date();
      temp = temp.filter(order => order.createdAt && isSameDay(order.createdAt, today));
    }
    if (filterStartDate) {
      const start = new Date(filterStartDate).setHours(0, 0, 0, 0);
      temp = temp.filter(order =>
        order.createdAt && new Date(order.createdAt).getTime() >= start
      );
    }
    if (filterEndDate) {
      const end = new Date(filterEndDate).setHours(23, 59, 59, 999);
      temp = temp.filter(order =>
        order.createdAt && new Date(order.createdAt).getTime() <= end
      );
    }
    if (filterStatus) {
      temp = temp.filter(order => order.status === filterStatus);
    }
    setFilteredOrders(temp);
  }, [orders, filterStartDate, filterEndDate, filterStatus]);

  // Find the current order (Pending, Processing, or Out for Delivery)
  const currentOrder = orders.find(
    o =>
      (o.status === 'Processing' || o.status === 'Pending' || o.trackingStatus === 'Out for Delivery') &&
      o.status !== 'Completed' && o.status !== 'Cancelled'
  );

  const sortedOrders = [...filteredOrders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  // Mark as delivered handler
  const handleMarkDelivered = async () => {
    if (!currentOrder) return;
    setStatusMsg('');
    try {
      const res = await fetch(API_MARK_DELIVERED(currentOrder._id), {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setStatusMsg('Order marked as delivered!');
      setTimeout(() => setStatusMsg(''), 2000);
    } catch (e) {
      setStatusMsg('Failed to mark as delivered: ' + e.message);
    }
  };

  // Logout handler
  const handleLogout = () => {
    if (onRiderLogout) onRiderLogout();
    window.location.href = '/admin-login';
  };

  // Toggle Day Off/Available
  const handleToggleDayOff = async () => {
    const newStatus = riderStatus === 'Day Off' ? 'Available' : 'Day Off';
    setStatusMsg('');
    try {
      const res = await fetch(API_RIDER_STATUS, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setRiderStatus(data.status);
      setStatusMsg(`Status set to ${data.status}`);
      setTimeout(() => setStatusMsg(''), 2000);
    } catch (e) {
      setStatusMsg('Failed to update status: ' + e.message);
    }
  };

  // Theme colors
  const statusColors = {
    Pending: '#fbc02d',
    Processing: '#1976d2',
    Completed: '#388e3c',
    Cancelled: '#d32f2f',
    'Out for Delivery': '#ff9800'
  };

  return (
    <div style={{
      maxWidth: 1100,
      margin: '30px auto',
      padding: 24,
      background: '#f6f7fa',
      borderRadius: 12,
      minHeight: '100vh'
    }}>
      {/* Rider Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24
      }}>
        <div>
          <h2 style={{ margin: 0, fontWeight: 700, color: '#003087' }}>Welcome, {rider.name}</h2>
          <div style={{ fontSize: 16, color: '#555', marginTop: 4 }}>
            Status: <span style={{
              color: riderStatus === 'Available' ? '#388e3c' : riderStatus === 'Day Off' ? '#d32f2f' : '#ff9800',
              fontWeight: 600
            }}>{riderStatus}</span>
          </div>
        </div>
        <div>
          <button
            onClick={handleLogout}
            style={{
              marginRight: 10,
              background: '#d32f2f',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              padding: '8px 18px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Logout
          </button>
          <button
            onClick={handleToggleDayOff}
            style={{
              background: riderStatus === 'Day Off' ? '#888' : '#ffc107',
              color: '#222',
              border: 'none',
              borderRadius: 6,
              padding: '8px 18px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            {riderStatus === 'Day Off' ? 'Set Available' : 'Set Day Off'}
          </button>
        </div>
      </div>

      {/* Current Order Section */}
      <div style={{
        background: '#fff',
        borderRadius: 14,
        boxShadow: '0 2px 8px #eee',
        padding: 28,
        marginBottom: 32,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        minHeight: 180
      }}>
        <h3 style={{ margin: 0, marginBottom: 12, color: '#003087', fontWeight: 700 }}>Current Order</h3>
        {statusMsg && <div style={{ color: '#388e3c', marginBottom: 10 }}>{statusMsg}</div>}
        {currentOrder ? (
          <div style={{ width: '100%' }}>
            <div style={{ marginBottom: 10, fontSize: 17 }}>
              <b>Order ID:</b> {currentOrder._id}<br />
              <b>Customer:</b> {currentOrder.customerName}<br />
              <b>Phone:</b> {currentOrder.customerPhone || '-'}<br />
              <b>Address:</b> {currentOrder.deliveryAddress}<br />
              <b>Status:</b> <span style={{ color: statusColors[currentOrder.status] || '#555', fontWeight: 600 }}>{currentOrder.status}</span><br />
              <b>Est. Delivery:</b> {currentOrder.estimatedDeliveryTime ? new Date(currentOrder.estimatedDeliveryTime).toLocaleTimeString() : '-'}<br />
              <b>Distance (km):</b> {typeof currentOrder.deliveryDistanceKm === 'number' ? currentOrder.deliveryDistanceKm.toFixed(2) : '-'}
            </div>
            <div style={{ marginBottom: 10 }}>
              <b>Items:</b>
              <ul style={{ margin: '6px 0 0 18px', padding: 0 }}>
                {currentOrder.items.map((item, idx) => (
                  <li key={idx}>
                    {item.name}
                    {item.sizeName && ` (${item.sizeName})`}
                    {item.selectedCrust && item.selectedCrust.name && ` [${item.selectedCrust.name}]`}
                    {` (x${item.quantity})`}
                  </li>
                ))}
              </ul>
            </div>
            <button
              onClick={handleMarkDelivered}
              style={{
                marginTop: 16,
                background: '#388e3c',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                padding: '10px 28px',
                fontWeight: 600,
                fontSize: 18,
                cursor: 'pointer'
              }}
            >
              Mark as Delivered
            </button>
            <a
              href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
                MAD_PIZZA_ADDRESS
              )}&destination=${encodeURIComponent(currentOrder.deliveryAddress)}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#003087', textDecoration: 'underline', marginTop: 10, display: 'inline-block' }}
            >
              Open Route in Google Maps
            </a>
          </div>
        ) : (
          <div style={{ color: '#888', fontSize: 17 }}>No current order assigned.</div>
        )}
      </div>

      {/* Order History Filters */}
      <div style={{
        background: '#fff',
        borderRadius: 10,
        boxShadow: '0 2px 8px #eee',
        padding: '18px 18px 10px 18px',
        marginBottom: 18,
        display: 'flex',
        gap: 16,
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <input
          type="date"
          value={filterStartDate}
          onChange={e => setFilterStartDate(e.target.value)}
          style={{
            padding: '8px',
            borderRadius: '6px',
            border: '1px solid #ddd',
            fontSize: '1rem',
            background: '#f6f7fa',
            color: '#222'
          }}
        />
        <input
          type="date"
          value={filterEndDate}
          onChange={e => setFilterEndDate(e.target.value)}
          style={{
            padding: '8px',
            borderRadius: '6px',
            border: '1px solid #ddd',
            fontSize: '1rem',
            background: '#f6f7fa',
            color: '#222'
          }}
        />
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          style={{
            padding: '8px',
            borderRadius: '6px',
            border: '1px solid #ddd',
            fontSize: '1rem',
            background: '#f6f7fa',
            color: '#222'
          }}
        >
          <option value="">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="Processing">Processing</option>
          <option value="Completed">Completed</option>
          <option value="Cancelled">Cancelled</option>
        </select>
        <button
          onClick={() => {
            setFilterStartDate('');
            setFilterEndDate('');
            setFilterStatus('');
          }}
          style={{
            background: '#d32f2f',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '8px 18px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Clear Filters
        </button>
      </div>

      {/* Order History Table */}
      <div style={{
        background: '#fff',
        borderRadius: 14,
        boxShadow: '0 2px 8px #eee',
        padding: 18,
        marginBottom: 24,
        overflowX: 'auto'
      }}>
        <h3 style={{ margin: 0, marginBottom: 12, color: '#003087', fontWeight: 700, textAlign: 'center' }}>Order History</h3>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          background: '#fff',
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 2px 8px #eee'
        }}>
          <thead>
            <tr>
              <th style={thStyle}>Order ID</th>
              <th style={thStyle}>Date</th>
              <th style={thStyle}>Customer</th>
              <th style={thStyle}>Address</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Distance (km)</th>
              <th style={thStyle}>Time (min)</th>
              <th style={thStyle}>Delivered/Updated At</th>
            </tr>
          </thead>
          <tbody>
            {sortedOrders.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', color: '#888' }}>
                  No orders found.
                </td>
              </tr>
            )}
            {sortedOrders.map(order => (
              <tr key={order._id} style={{ background: order.status === 'Completed' ? '#e3f6e8' : order.status === 'Cancelled' ? '#ffe0e0' : 'inherit' }}>
                <td style={tdStyle}>{order.orderNumber ? order.orderNumber : ''}</td>
                <td style={tdStyle}>{order.createdAt ? new Date(order.createdAt).toLocaleString() : '-'}</td>
                <td style={tdStyle}>{order.customerName}</td>
                <td style={tdStyle}>{order.deliveryAddress}</td>
                <td style={{ ...tdStyle, color: statusColors[order.status] || '#555', fontWeight: 600 }}>{order.status}</td>
                <td style={tdStyle}>
                  {typeof order.deliveryDistanceKm === 'number'
                    ? order.deliveryDistanceKm.toFixed(2)
                    : order.deliveryDistanceText || '-'}
                </td>
                <td style={tdStyle}>
                  {order.status === 'Completed' && getActualTimeTaken(order)
                    ? `${getActualTimeTaken(order)} min`
                    : typeof order.deliveryDurationMin === 'number'
                    ? `${order.deliveryDurationMin.toFixed(1)} min`
                    : order.deliveryDurationText || '-'}
                </td>
                <td style={tdStyle}>
                  {order.updatedAt
                    ? new Date(order.updatedAt).toLocaleString()
                    : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {err && <div style={{ color: 'red', marginTop: 8 }}>{err}</div>}
      </div>
    </div>
  );
}

// Table cell styles
const thStyle = {
  background: '#003087',
  color: '#fff',
  fontWeight: 600,
  textAlign: 'left',
  padding: '12px 8px',
  borderBottom: '1px solid #f0f0f0',
  fontSize: '1rem'
};
const tdStyle = {
  padding: '10px 8px',
  borderBottom: '1px solid #f0f0f0',
  fontSize: '1rem'
};