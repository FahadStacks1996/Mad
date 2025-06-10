import React, { useContext, useEffect, useState, useCallback, useRef } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import './OrderHistory.css';

const API_BASE = "http://localhost:5001";

// Helper to check if two dates are the same day
const isSameDay = (dateA, dateB) => {
  const a = new Date(dateA);
  const b = new Date(dateB);
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
};

const OrderHistory = () => {
  const { user, token } = useContext(AuthContext);

  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const printRef = useRef();
  // Admin filters
  const [filterCustomerName, setFilterCustomerName] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // For viewing/printing order details
  const [selectedOrder, setSelectedOrder] = useState(null);

  // For live tracking modal
  const [trackingInfo, setTrackingInfo] = useState(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState('');

  // For assign rider modal
  const [assignOrderId, setAssignOrderId] = useState(null);
  const [availableRiders, setAvailableRiders] = useState([]);
  const [assignLoading, setAssignLoading] = useState(false);

  // Fetch orders
  const fetchOrders = useCallback(async () => {
    if (!token) {
      setError("Authentication token not found. Please log in.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/api/orders`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || `HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setOrders(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Filtering logic
  useEffect(() => {
    let tempFiltered = [...orders];
    const isAdmin = user && user.role === 'admin';

    // If admin and no filters, show only today's orders
    if (
      isAdmin &&
      !filterCustomerName.trim() &&
      !filterStartDate &&
      !filterEndDate &&
      !filterStatus
    ) {
      const today = new Date();
      tempFiltered = tempFiltered.filter(order =>
        order.createdAt && isSameDay(order.createdAt, today)
      );
    } else if (isAdmin) {
      if (filterCustomerName.trim()) {
        tempFiltered = tempFiltered.filter(order =>
          order.customerName && order.customerName.toLowerCase().includes(filterCustomerName.trim().toLowerCase())
        );
      }
      if (filterStartDate) {
        const start = new Date(filterStartDate).setHours(0, 0, 0, 0);
        tempFiltered = tempFiltered.filter(order =>
          order.createdAt && new Date(order.createdAt).getTime() >= start
        );
      }
      if (filterEndDate) {
        const end = new Date(filterEndDate).setHours(23, 59, 59, 999);
        tempFiltered = tempFiltered.filter(order =>
          order.createdAt && new Date(order.createdAt).getTime() <= end
        );
      }
      if (filterStatus) {
        tempFiltered = tempFiltered.filter(order => order.status === filterStatus);
      }
    }
    setFilteredOrders(tempFiltered);
  }, [orders, filterCustomerName, filterStartDate, filterEndDate, filterStatus, user]);

  const handleClearFilters = () => {
    setFilterCustomerName('');
    setFilterStartDate('');
    setFilterEndDate('');
    setFilterStatus('');
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    if (!token) return;
    try {
      const response = await fetch(`${API_BASE}/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Failed to update status');
      }
      fetchOrders();
    } catch (err) {
      setError(err.message);
    }
  };

  // Assign rider to order (admin only) - open modal
  const openAssignRiderModal = async (orderId) => {
    setAssignOrderId(orderId);
    setAssignLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/riders/available`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setAvailableRiders(data);
    } catch (err) {
      setAvailableRiders([]);
    } finally {
      setAssignLoading(false);
    }
  };

  // Actually assign the selected rider
  const assignRider = async (orderId, riderId) => {
    if (!token) return;
    setAssignLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/orders/${orderId}/assign-rider`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ riderId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setAssignOrderId(null);
      fetchOrders();
    } catch (err) {
      alert(err.message);
    } finally {
      setAssignLoading(false);
    }
  };

  // Fetch live tracking info
  const fetchTracking = async (orderId) => {
    setTrackingLoading(true);
    setTrackingError('');
    setTrackingInfo(null);
    try {
      const res = await fetch(`${API_BASE}/api/orders/${orderId}/tracking`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setTrackingInfo(data);
    } catch (err) {
      setTrackingError(err.message);
    } finally {
      setTrackingLoading(false);
    }
  };

  // Print handler
  const handlePrint = (order) => {
    setSelectedOrder(order);
    setTimeout(() => {
      window.print();
      setSelectedOrder(null);
    }, 200);
  };

  if (isLoading && orders.length === 0) return <div style={{ padding: 32, textAlign: 'center' }}>Loading order history...</div>;
  if (error) return <div style={{ padding: 32, textAlign: 'center', color: 'red' }}>Error loading orders: {error}</div>;

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h2 style={{ textAlign: 'center', color: '#333', marginBottom: '20px' }}>Order History</h2>
      
      {user && user.role === 'admin' && (
        <div className="order-filters" style={{ 
            marginBottom: '20px', 
            padding: '15px',
            background: '#f9f9f9', 
            borderRadius: '8px', 
            display: 'flex', 
            gap: '15px', 
            flexWrap: 'wrap', 
            alignItems: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <input
            type="text"
            value={filterCustomerName}
            onChange={e => setFilterCustomerName(e.target.value)}
            placeholder="Filter by Customer Name"
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd', flexGrow: 1 }}
          />
          <input
            type="date"
            value={filterStartDate}
            onChange={e => setFilterStartDate(e.target.value)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
          />
          <input
            type="date"
            value={filterEndDate}
            onChange={e => setFilterEndDate(e.target.value)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
          />
          <select 
            value={filterStatus} 
            onChange={e => setFilterStatus(e.target.value)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd', background: 'white' }}
          >
            <option value="">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Processing">Processing</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
          <button className="clear-filters-btn" onClick={handleClearFilters}>
            Clear Filters
          </button>
        </div>
      )}

      {filteredOrders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px', background: '#fff', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            No orders found matching your criteria.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="orders-table">
            <thead>
              <tr>
                <th>Order ID</th>
                {user && user.role === 'admin' && <th>Customer Name</th>}
                <th>Date & Time</th>
                <th>Items</th>
                <th>Total Amount</th>
                <th>Payment Method</th>
                <th>Status</th>
                <th>Phone</th>
                <th>Address</th>
                <th>Est. Delivery</th>
                <th>Distance (km)</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map(order => {
                const isDone = order.status === 'Completed' || order.status === 'Cancelled';
                return (
                <tr key={order._id}>
                  <td data-label="Order ID">{order.orderNumber || order._id}</td>
                  {user && user.role === 'admin' && <td data-label="Customer Name">{order.customerName}</td>}
                  <td data-label="Date">{new Date(order.createdAt).toLocaleString()}</td>
                  <td data-label="Items">
                    <ul style={{ margin: 0, paddingLeft: 15, listStyle: 'disc' }}>
                      {order.items.map((item, idx) => (
                        <li key={idx}>
                          {item.name}
                          {item.sizeName && ` (${item.sizeName})`}
                          {item.selectedCrust && item.selectedCrust.name && ` [${item.selectedCrust.name}]`}
                          {` (x${item.quantity})`} - Rs. {(item.price * item.quantity).toFixed(2)}
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td data-label="Total">Rs. {order.totalAmount.toFixed(2)}</td>
                  <td data-label="Payment">{order.paymentMethod}</td>
                  <td data-label="Status" className={`status-${order.status?.toLowerCase()}`}>
                    {order.status}
                  </td>
                  <td data-label="Phone">{order.customerPhone || '-'}</td>
                  <td data-label="Address">{order.deliveryAddress || '-'}</td>
                  <td data-label="Est. Delivery">
                    {order.estimatedDeliveryTime ? new Date(order.estimatedDeliveryTime).toLocaleTimeString() : '-'}
                  </td>
                  <td data-label="Distance (km)">
                    {order.deliveryDistanceKm ? order.deliveryDistanceKm.toFixed(2) : '-'}
                  </td>
                  <td data-label="Actions">
                    {user && user.role === 'admin' && (
                      <>
                        <select 
                          value={order.status} 
                          onChange={(e) => updateOrderStatus(order._id, e.target.value)}
                          style={{padding: '5px', borderRadius: '4px', border: '1px solid #ccc'}}
                          disabled={isLoading}
                        >
                          <option value="Pending">Pending</option>
                          <option value="Processing">Processing</option>
                          <option value="Completed">Completed</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                        {!isDone && !order.rider && (
                          <button style={{ marginLeft: 8 }} onClick={() => openAssignRiderModal(order._id)}>
                            Assign Rider
                          </button>
                        )}
                      </>
                    )}
                    <button style={{ marginLeft: 8 }} onClick={() => setSelectedOrder(order)}>View</button>
                    <button style={{ marginLeft: 8 }} onClick={() => handlePrint(order)}>Print</button>
                    {!isDone && (
                      <button style={{ marginLeft: 8 }} onClick={() => fetchTracking(order._id)}>
                        Track
                      </button>
                    )}
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      )}

      {/* Assign Rider Modal */}
      {assignOrderId && (
        <div className="modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.3)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="modal-content" style={{
            background: '#fff', padding: 24, borderRadius: 8, minWidth: 350, maxWidth: 400, position: 'relative'
          }}>
            <button
              style={{ position: 'absolute', top: 8, right: 8, background: '#eee', border: 'none', borderRadius: 4, padding: '2px 8px', cursor: 'pointer' }}
              onClick={() => setAssignOrderId(null)}
            >X</button>
            <h3 style={{ textAlign: 'center', marginBottom: 12 }}>Assign Rider</h3>
            {assignLoading && <p>Loading available riders...</p>}
            {!assignLoading && availableRiders.length === 0 && (
              <p style={{ color: '#d32f2f' }}>No available riders found.</p>
            )}
            {!assignLoading && availableRiders.length > 0 && (
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {availableRiders.map(rider => (
                  <li key={rider._id} style={{ marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>
                      <b>{rider.name}</b> | Bike: {rider.bikeNumber} | {rider.phone}
                    </span>
                    <button
                      style={{ marginLeft: 10, padding: '4px 12px', borderRadius: 6, background: '#003087', color: '#fff', border: 'none', cursor: 'pointer' }}
                      onClick={() => assignRider(assignOrderId, rider._id)}
                      disabled={assignLoading}
                    >
                      Assign
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Order Details Modal */}
     {/* Print Area (POS style) */}
{selectedOrder && (
  <div
    className="print-area receipt-print"
    style={{
      display: 'none',
      fontFamily: 'monospace',
      fontSize: 11,
      color: '#000',
      background: '#fff',
      padding: 0,
      width: 380,
      margin: '0 auto'
    }}
  >
    <div style={{ textAlign: 'center', margin: 0, padding: 0 }}>
      <img
        src="/Images/madpizzalogo.png"
        alt="Mad Pizza Logo"
        style={{ height: 40, objectFit: 'contain', margin: 0, padding: 0 }}
      />
      <div style={{ fontWeight: 700, fontSize: 13, margin: '2px 0' }}>Mad Pizza</div>
      <div style={{ fontSize: 10 }}>C-22, Block-2, Lane 5, Kehkashan, Clifton, Karachi</div>
      <div style={{ fontSize: 10 }}>0321-0444333</div>
    </div>
    <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />
    <div style={{ fontSize: 10, margin: 0, padding: 0 }}>
      <b>Order:</b> {selectedOrder.orderNumber || selectedOrder._id}<br />
      <b>Date:</b> {new Date(selectedOrder.createdAt).toLocaleString()}<br />
      <b>Name:</b> {selectedOrder.customerName}<br />
      <b>Phone:</b> {selectedOrder.customerPhone || '-'}<br />
      <b>Address:</b> {selectedOrder.deliveryAddress || '-'}<br />
      <b>Payment:</b> {selectedOrder.paymentMethod}
    </div>
    <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />
    <table style={{ width: '100%', fontSize: 10, borderCollapse: 'collapse', margin: 0 }}>
      <thead>
        <tr>
          <th style={{ textAlign: 'left', padding: 0 }}>Item</th>
          <th style={{ textAlign: 'center', padding: 0 }}>Qty</th>
          <th style={{ textAlign: 'right', padding: 0 }}>Total</th>
        </tr>
      </thead>
      <tbody>
        {selectedOrder.items.map((item, idx) => (
          <tr key={idx}>
            <td style={{ padding: 0, fontSize: 10 }}>
              {item.name}
              {item.sizeName && ` (${item.sizeName})`}
              {item.selectedCrust && item.selectedCrust.name && ` [${item.selectedCrust.name}]`}
            </td>
            <td style={{ textAlign: 'center', padding: 0 }}>{item.quantity || 1}</td>
            <td style={{ textAlign: 'right', padding: 0 }}>
              Rs. {(Number(item.price) * (item.quantity || 1)).toFixed(0)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />
    <div style={{ textAlign: 'right', fontWeight: 700, fontSize: 12, margin: 0 }}>
      Total: Rs. {Number(selectedOrder.totalAmount).toFixed(0)}
    </div>
    <div style={{ textAlign: 'center', fontSize: 10, margin: '6px 0 0 0' }}>
      --- Thank you! ---
    </div>
  </div>
)}

      {/* Live Tracking Modal */}
      {(trackingInfo || trackingLoading || trackingError) && (
        <div className="modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.3)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="modal-content" style={{
            background: '#fff', padding: 24, borderRadius: 8, minWidth: 350, maxWidth: 500, position: 'relative'
          }}>
            <button
              style={{ position: 'absolute', top: 8, right: 8, background: '#eee', border: 'none', borderRadius: 4, padding: '2px 8px', cursor: 'pointer' }}
              onClick={() => { setTrackingInfo(null); setTrackingError(''); setTrackingLoading(false); }}
            >X</button>
            <h3 style={{ textAlign: 'center', marginBottom: 12 }}>Live Order Tracking</h3>
            {trackingLoading && <p>Loading tracking info...</p>}
            {trackingError && <p style={{ color: 'red' }}>{trackingError}</p>}
            {trackingInfo && (
              <div>
                <p><b>Status:</b> {trackingInfo.trackingStatus}</p>
                <p><b>Estimated Delivery:</b> {trackingInfo.estimatedDeliveryTime ? new Date(trackingInfo.estimatedDeliveryTime).toLocaleTimeString() : '-'}</p>
                {trackingInfo.rider ? (
                  <>
                    <p><b>Rider:</b> {trackingInfo.rider.name} ({trackingInfo.rider.phone})</p>
                    <p><b>Rider Location:</b> {trackingInfo.rider.location || 'Updating...'}</p>
                  </>
                ) : (
                  <p><b>Rider:</b> Not assigned yet</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderHistory;