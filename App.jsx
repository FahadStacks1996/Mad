import React, { useEffect, useState, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import CustomerSignup from './pages/CustomerSignup';
import CustomerLogin from './pages/CustomerLogin';
import CustomerDashboard from './pages/CustomerDashboard';
import AdminLogin from './pages/AdminLogin';
import POS from './pages/POS';
import ProductManagement from './pages/ProductManagement';
import OrderHistory from './pages/OrderHistory';
import Home from './pages/Home';
import InventoryManagement from './pages/InventoryManagement';
import RiderManagement from './pages/RiderManagement';
import RiderDashboard from './pages/RiderDashboard';
import Landing from './pages/Landing'; // <-- Use the new landing page

function App() {
  const [riderToken, setRiderToken] = React.useState(localStorage.getItem('riderToken') || '');
  const [rider, setRider] = React.useState(localStorage.getItem('rider') ? JSON.parse(localStorage.getItem('rider')) : null);

  const handleRiderLogin = (token, riderObj) => {
    setRiderToken(token);
    setRider(riderObj);
    localStorage.setItem('riderToken', token);
    localStorage.setItem('rider', JSON.stringify(riderObj));
  };

  const handleRiderLogout = () => {
    setRiderToken('');
    setRider(null);
    localStorage.removeItem('riderToken');
    localStorage.removeItem('rider');
  };

  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/signup" element={<CustomerSignup />} />
            <Route path="/customer" element={<CustomerDashboard />} />
            <Route path="/admin-login" element={<AdminLogin onRiderLogin={handleRiderLogin} />} />
            <Route path="/rider-dashboard" element={<RiderDashboard token={riderToken} rider={rider} onRiderLogout={handleRiderLogout} />} />

            {/* Admin Dashboard with nested routes */}
            <Route path="/home" element={
              <RequireAdmin>
                <Home />
              </RequireAdmin>
            }>
              <Route index element={<DashboardMain />} />
              <Route path="pos" element={<POS />} />
              <Route path="product-management" element={<ProductManagement />} />
              <Route path="order-history" element={<OrderHistory />} />
              <Route path="inventory-management" element={<InventoryManagement />} />
              <Route path="rider-management" element={<RiderManagement />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}

// Dashboard main page (the summary page)
function DashboardMain() {
  const { token } = useContext(AuthContext);
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchOrders() {
      setIsLoading(true);
      try {
        const res = await fetch("http://localhost:5001/api/orders", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setOrders(Array.isArray(data) ? data : []);
      } catch {
        setOrders([]);
      } finally {
        setIsLoading(false);
      }
    }
    fetchOrders();
  }, [token]);

  // Date helpers
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();

  // Stats
  const totalOrdersThisMonth = orders.filter(order => {
    const d = new Date(order.createdAt);
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  }).length;

  const totalOrdersToday = orders.filter(order => {
    const d = new Date(order.createdAt);
    return d.toISOString().slice(0, 10) === todayStr;
  }).length;

  const ordersInProcessing = orders.filter(order => order.status === "Processing").length;

  // --- Bar Chart: Only show orders completed today, processing today, cancelled today ---
  const todayOrders = orders.filter(order => {
    const d = new Date(order.createdAt);
    return d.toISOString().slice(0, 10) === todayStr;
  });

  const barStatusCounts = todayOrders.reduce((acc, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1;
    return acc;
  }, {});
  const barStatusColors = {
    "Completed": "#388e3c",
    "Processing": "#1976d2",
    "Cancelled": "#d32f2f"
  };
  const barStatusLabels = ["Completed", "Processing", "Cancelled"].filter(
    status => barStatusCounts[status] > 0
  );

  // --- Pie Chart: Today's Orders by Status ---
  const todayStatusCounts = todayOrders.reduce((acc, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1;
    return acc;
  }, {});
  const pieLabels = Object.keys(todayStatusCounts).filter(status => todayStatusCounts[status] > 0);
  const pieTotal = Object.values(todayStatusCounts).reduce((a, b) => a + b, 0);

  function getPieSegments() {
    let start = 0;
    return pieLabels.map((status) => {
      const value = todayStatusCounts[status];
      const percent = value / pieTotal;
      const end = start + percent * 100;
      const color = barStatusColors[status] || "#888";
      const segment = `${color} ${start}% ${end}%`;
      start = end;
      return segment;
    });
  }

  // --- Bar Chart Scaling ---
  const maxBarValue = Math.max(...barStatusLabels.map(s => barStatusCounts[s]), 1);
  const maxBarHeight = 120; // px

  return (
    <div style={{ padding: "0 0.5vw" }}>
      <h1 style={{ fontWeight: 700, fontSize: '2rem', marginBottom: 24 }}>Dashboard</h1>
      <div style={{
        display: 'flex',
        gap: 24,
        flexWrap: 'wrap',
        marginBottom: 24,
        justifyContent: 'flex-start'
      }}>
        <div style={{
          background: '#fff',
          borderRadius: 12,
          padding: 24,
          minWidth: 260,
          flex: 1,
          boxShadow: '0 2px 8px #eee',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start'
        }}>
          <div style={{ color: '#388e3c', fontWeight: 700, fontSize: 18 }}>Orders This Month</div>
          <div style={{ fontSize: 32, fontWeight: 700, margin: '10px 0' }}>
            {isLoading ? "..." : totalOrdersThisMonth}
          </div>
        </div>
        <div style={{
          background: '#fff',
          borderRadius: 12,
          padding: 24,
          minWidth: 260,
          flex: 1,
          boxShadow: '0 2px 8px #eee',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start'
        }}>
          <div style={{ color: '#1976d2', fontWeight: 700, fontSize: 18 }}>Orders Today</div>
          <div style={{ fontSize: 32, fontWeight: 700, margin: '10px 0' }}>
            {isLoading ? "..." : totalOrdersToday}
          </div>
        </div>
        <div style={{
          background: '#fff',
          borderRadius: 12,
          padding: 24,
          minWidth: 260,
          flex: 1,
          boxShadow: '0 2px 8px #eee',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start'
        }}>
          <div style={{ color: '#ffc107', fontWeight: 700, fontSize: 18 }}>In Processing</div>
          <div style={{ fontSize: 32, fontWeight: 700, margin: '10px 0' }}>
            {isLoading ? "..." : ordersInProcessing}
          </div>
        </div>
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2.5fr 1.5fr',
        gap: 24,
        alignItems: 'stretch'
      }}>
        {/* Bar Chart: Orders by Status (today only) */}
        {barStatusLabels.length > 0 && (
          <div style={{
            background: '#fff',
            borderRadius: 12,
            padding: 24,
            minWidth: 320,
            minHeight: 280,
            boxShadow: '0 2px 8px #eee',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            position: 'relative'
          }}>
            <h3 style={{
              margin: 0,
              fontWeight: 600,
              fontSize: 18,
              marginBottom: 12,
              textAlign: 'center'
            }}>Orders by Status</h3>
            <div style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: 100,
              marginTop: 24,
              height: maxBarHeight + 40,
              minHeight: 120,
              width: '100%',
              overflowX: 'auto',
              justifyContent: 'center'
            }}>
              {barStatusLabels.map((status) => (
                <div key={status} style={{
                  width: 38,
                  height: maxBarHeight,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  position: 'relative'
                }}>
                  <div style={{
                    width: 38,
                    height: `${Math.max(20, (barStatusCounts[status] / maxBarValue) * maxBarHeight)}px`,
                    background: barStatusColors[status] || "#888",
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'center',
                    position: 'relative',
                    transition: 'height 0.3s'
                  }}>
                    <span style={{
                      position: 'absolute',
                      top: -28,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      fontWeight: 600,
                      color: barStatusColors[status] || "#888",
                      fontSize: 18
                    }}>{barStatusCounts[status]}</span>
                  </div>
                  <span style={{
                    marginTop: 8,
                    color: barStatusColors[status] || "#888",
                    fontWeight: 500,
                    fontSize: 15,
                    textAlign: 'center',
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    <span style={{
                      display: 'inline-block',
                      width: 14,
                      height: 14,
                      borderRadius: '50%',
                      background: barStatusColors[status] || "#888",
                      marginRight: 6,
                      verticalAlign: 'middle'
                    }}></span>
                    {status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* Pie Chart: Today's Orders by Status */}
        {pieLabels.length > 0 && (
          <div style={{
            background: '#fff',
            borderRadius: 12,
            padding: 24,
            minWidth: 320,
            minHeight: 280,
            boxShadow: '0 2px 8px #eee',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <h3 style={{ margin: 0, fontWeight: 600, fontSize: 18, marginBottom: 12, textAlign: 'center' }}>Today's Orders by Status</h3>
            <div style={{
              width: 160,
              height: 160,
              borderRadius: '50%',
              background: pieLabels.length > 0
                ? `conic-gradient(${getPieSegments().join(', ')})`
                : '#eee',
              margin: '24px auto'
            }}></div>
            <div style={{ fontSize: 15, color: '#555', marginTop: 12, width: '100%' }}>
              {pieLabels.map(status => (
                <div key={status} style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{
                    color: barStatusColors[status] || "#888",
                    fontWeight: 700,
                    marginRight: 8,
                    fontSize: 18
                  }}>●</span>
                  <span style={{ color: barStatusColors[status] || "#888", fontWeight: 500 }}>{status} ({todayStatusCounts[status]})</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Admin-only access guard
function RequireAdmin({ children }) {
  const { user } = React.useContext(AuthContext);
  if (!user) return <Navigate to="/admin-login" replace />;
  if (user.role !== 'admin') return <Navigate to="/admin-login" replace />;
  return children;
}

// Customer-only access guard
function RequireCustomer({ children }) {
  const { user } = React.useContext(AuthContext);
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'customer') return <Navigate to="/login" replace />;
  return children;
}

export default App;