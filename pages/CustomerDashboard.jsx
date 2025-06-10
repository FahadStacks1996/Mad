import React, { useContext, useState, useEffect, useCallback } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { CartContext } from '../contexts/CartContext';
import { useNavigate } from 'react-router-dom';
import './POS.css'; // Assuming styles are shared or similar

const API_PRODUCTS_URL = 'http://localhost:5001/api/products';
const API_ORDERS_URL = 'http://localhost:5001/api/orders';

const CustomerDashboard = () => {
  const { user, logout, token } = useContext(AuthContext);
  const { cartItems, addToCart, removeFromCart, clearCart } = useContext(CartContext);
  const navigate = useNavigate();

  // If logged in as admin or rider, redirect to their dashboards
  useEffect(() => {
    if (user?.role === 'admin') navigate('/home');
    if (user?.role === 'rider') navigate('/rider-dashboard');
  }, [user, navigate]);

  const [menuProducts, setMenuProducts] = useState([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [productError, setProductError] = useState(null);

  // If user is logged in, use their info, else let customer enter info
  const [address, setAddress] = useState(user?.address || '');
  const [customerName, setCustomerName] = useState(user?.username || user?.firstName || '');
  const [customerPhone, setCustomerPhone] = useState(user?.phone || '');

  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [orderError, setOrderError] = useState(null);
  const [orderSuccess, setOrderSuccess] = useState(null);

  const [showOrderHistoryModal, setShowOrderHistoryModal] = useState(false);
  const [customerOrders, setCustomerOrders] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState(null);

  // For size and crust selection modals
  const [isSizeModalOpen, setIsSizeModalOpen] = useState(false);
  const [selectedProductForSize, setSelectedProductForSize] = useState(null);
  const [isCrustModalOpen, setIsCrustModalOpen] = useState(false);
  const [crustOptions, setCrustOptions] = useState([]);

  // Only fetch products once (for both guests and logged-in users)
  const fetchProducts = useCallback(async () => {
    setIsLoadingProducts(true);
    setProductError(null);
    try {
      const response = await fetch(API_PRODUCTS_URL);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status} - ${(await response.json()).message}`);
      const data = await response.json();
      setMenuProducts(data);
    } catch (err) {
      setProductError(err.message);
    } finally {
      setIsLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const productsByCategory = menuProducts.reduce((acc, product) => {
    if (!acc[product.category]) acc[product.category] = [];
    acc[product.category].push(product);
    return acc;
  }, {});

  // --- Product selection handlers ---
  const handleProductClick = (product) => {
    if (product.sizeVariants && product.sizeVariants.length > 0) {
      setSelectedProductForSize(product);
      setIsSizeModalOpen(true);
    } else {
      // No size variants, check for crust
      if (product.crustOptions && product.crustOptions.length > 0) {
        setSelectedProductForSize({
          ...product,
          selectedSize: null,
          selectedPrice: product.price,
        });
        setCrustOptions(product.crustOptions);
        setIsCrustModalOpen(true);
      } else {
        addToCart({
          _id: `${product._id}`,
          productId: product._id,
          name: product.name,
          price: product.price,
          quantity: 1,
        });
      }
    }
  };

  const handleSelectSizeAndMaybeCrust = (product, variant) => {
    if (product.crustOptions && product.crustOptions.length > 0) {
      setSelectedProductForSize({
        ...product,
        selectedSize: variant.sizeName,
        selectedPrice: variant.price,
      });
      setCrustOptions(product.crustOptions);
      setIsCrustModalOpen(true);
      setIsSizeModalOpen(false);
    } else {
      addToCart({
        _id: `${product._id}_${variant.sizeName}`,
        productId: product._id,
        name: product.name,
        sizeName: variant.sizeName,
        price: variant.price,
        quantity: 1,
      });
      setIsSizeModalOpen(false);
      setSelectedProductForSize(null);
    }
  };

  const handleSelectCrustAndAddToCart = (crust) => {
    const product = selectedProductForSize;
    addToCart({
      _id: `${product._id}_${product.selectedSize || ''}_${crust.name}`,
      productId: product._id,
      name: product.name,
      sizeName: product.selectedSize,
      price: Number(product.selectedPrice) + Number(crust.additionalPrice || 0),
      selectedCrust: { name: crust.name, additionalPrice: Number(crust.additionalPrice) || 0 },
      quantity: 1,
    });
    setIsCrustModalOpen(false);
    setSelectedProductForSize(null);
    setCrustOptions([]);
  };

  // --- Place Order ---
  const totalPrice = cartItems.reduce((sum, item) => sum + (Number(item.price) * (item.quantity || 1)), 0);

  const handlePlaceOrder = async (paymentMethodType = 'Card Payment') => {
    if (cartItems.length === 0) { setOrderError("Your cart is empty."); return; }
    if (!address.trim()) { setOrderError("Please enter your delivery address."); return; }
    if (!user && (!customerName.trim() || !customerPhone.trim())) {
      setOrderError("Please enter your name and phone number.");
      return;
    }

    setIsSubmittingOrder(true); setOrderError(null); setOrderSuccess(null);

    const orderPayload = {
      items: cartItems.map(item => ({
        productId: item.productId,
        name: item.name,
        sizeName: item.sizeName,
        selectedCrust: item.selectedCrust
          ? {
              name: item.selectedCrust.name || '',
              additionalPrice: Number(item.selectedCrust.additionalPrice) || 0
            }
          : { name: '', additionalPrice: 0 },
        price: item.price,
        quantity: item.quantity,
      })),
      totalAmount: totalPrice,
      customerName: user
        ? user.username || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Customer'
        : customerName,
      customerPhone: user ? user.phone : customerPhone,
      userId: user?._id,
      status: 'Pending',
      paymentMethod: paymentMethodType,
      deliveryAddress: address,
    };

    try {
      const response = await fetch(API_ORDERS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
        body: JSON.stringify(orderPayload),
      });
      const responseData = await response.json();
      if (!response.ok) throw new Error(responseData.message || `HTTP error! status: ${response.status}`);
      setOrderSuccess(`Order ${responseData._id} placed successfully!`);
      clearCart();
      setTimeout(() => setOrderSuccess(''), 5000);
    } catch (err) {
      setOrderError(err.message);
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // --- Order History ---
  const fetchCustomerOrders = useCallback(async () => {
    if (!token || !user || user.role !== 'customer') return;
    setIsLoadingHistory(true);
    setHistoryError(null);
    try {
      const response = await fetch(API_ORDERS_URL, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch orders');
      const allOrders = await response.json();
      const filtered = allOrders.filter(order => order.userId === user._id);
      setCustomerOrders(filtered);
    } catch (err) {
      setHistoryError(err.message);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [token, user]);

  useEffect(() => { if (showOrderHistoryModal) fetchCustomerOrders(); }, [showOrderHistoryModal, fetchCustomerOrders]);

  return (
    <div className="zettle-root">
      <div className="zettle-products">
        <div className="zettle-header" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '10px', borderBottom: '1px solid #eee' }}>
          <img src="/Images/madpizzalogo.png" alt="Mad Pizza Logo" style={{ height: 80, objectFit: "contain" }}/>
          <div>
            {user ? (
              <>
                <span style={{marginRight: '15px', fontWeight: 'bold'}}>Welcome, {user.username || user.firstName || 'Customer'}!</span>
                <button className="action-button" style={{ background: '#5bc0de', color: '#fff', marginRight: 8, padding: '8px 12px' }} onClick={() => setShowOrderHistoryModal(true)}>My Orders</button>
                <button className="action-button" style={{ background: '#d9534f', color: '#fff', padding: '8px 12px' }} onClick={() => { logout(); navigate('/admin-login'); }}>Logout</button>
              </>
            ) : (
              <>
                <span style={{marginRight: '15px', fontWeight: 'bold'}}>Welcome, Guest!</span>
                <button
                  className="action-button"
                  style={{ background: '#5bc0de', color: '#fff', marginRight: 8, padding: '8px 12px' }}
                  onClick={() => navigate('/admin-login')}
                >
                  Login
                </button>
                <button
                  className="action-button"
                  style={{ background: '#fa8922', color: '#fff', padding: '8px 12px' }}
                  onClick={() => navigate('/signup')}
                >
                  Signup
                </button>
              </>
            )}
          </div>
        </div>
        <div style={{ margin: '15px 0' }}>
          {!user && (
            <>
              <label htmlFor="customerName" style={{ fontWeight: 600, color: "#333", display: 'block', marginBottom: '5px' }}>Name:</label>
              <input id="customerName" type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Enter your name" style={{ width: '100%', padding: '10px', fontSize: 16, borderRadius: 6, border: '1px solid #ccc', boxSizing: 'border-box', marginBottom: 8 }} required />
              <label htmlFor="customerPhone" style={{ fontWeight: 600, color: "#333", display: 'block', marginBottom: '5px' }}>Phone Number:</label>
              <input id="customerPhone" type="text" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="Enter your phone number" style={{ width: '100%', padding: '10px', fontSize: 16, borderRadius: 6, border: '1px solid #ccc', boxSizing: 'border-box', marginBottom: 8 }} required />
            </>
          )}
          <label htmlFor="deliveryAddressCust" style={{ fontWeight: 600, color: "#333", display: 'block', marginBottom: '5px' }}>Delivery Address:</label>
          <input id="deliveryAddressCust" type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="Enter your delivery address" style={{ width: '100%', padding: '10px', fontSize: 16, borderRadius: 6, border: '1px solid #ccc', boxSizing: 'border-box' }} required/>
        </div>

        {isLoadingProducts && <p style={{textAlign: 'center'}}>Loading menu...</p>}
        {productError && <p style={{textAlign: 'center', color: 'red'}}>Error loading menu: {productError}</p>}

        {Object.entries(productsByCategory).map(([category, categoryProducts]) => (
          <div key={category} className="zettle-category">
            <div className="zettle-category-title">{category}</div>
            <div className="zettle-grid">
              {categoryProducts.map(product => (
                <div key={product._id} className="zettle-product-card" onClick={() => handleProductClick(product)}>
                  <img src={product.image || '/Images/default-product.jpg'} alt={product.name} className="zettle-product-img"/>
                  <div className="zettle-product-name">{product.name}</div>
                  <div className="zettle-product-price">
                    {product.sizeVariants && product.sizeVariants.length > 0 ? (
                        product.sizeVariants.map(sv => (
                            <span key={sv.sizeName} style={{display: 'block', fontSize: '0.9em'}}>
                                {sv.sizeName}: Rs. {Number(sv.price).toFixed(2)}
                            </span>
                        ))
                    ) : <span>Price N/A</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="zettle-cart">
        <div className="zettle-cart-title">Your Cart</div>
        {orderError && <p style={{color: 'red', textAlign: 'center'}}>{orderError}</p>}
        {orderSuccess && <p style={{color: 'green', textAlign: 'center'}}>{orderSuccess}</p>}
        <div className="zettle-cart-list">
          {cartItems.length === 0 && <div className="zettle-cart-empty">Your cart is empty.</div>}
          {cartItems.map((item) => (
            <div className="zettle-cart-row" key={item._id}>
              <div className="zettle-cart-itemname">
                {item.name} {item.sizeName && `(${item.sizeName})`} {item.selectedCrust && item.selectedCrust.name && `[${item.selectedCrust.name}]`}
              </div>
              <div className="zettle-cart-itemprice">Rs. {(Number(item.price) * item.quantity).toFixed(2)}</div>
              <div className="cart-qty-btns">
                <button className="cart-btn cart-btn-remove" onClick={() => removeFromCart(item._id)}>🗑️</button>
                <span className="cart-qty">{item.quantity}</span>
                <button className="cart-btn cart-btn-add" onClick={() => addToCart(item)}>+</button>
              </div>
            </div>
          ))}
        </div>
        <div className="zettle-cart-sticky">
          <div className="zettle-cart-total-row"><span>Total</span><span className="zettle-cart-total">Rs. {totalPrice.toFixed(2)}</span></div>
          <button className="zettle-cart-pay" disabled={cartItems.length === 0 || isSubmittingOrder || !address.trim() || (!user && (!customerName.trim() || !customerPhone.trim()))} onClick={() => handlePlaceOrder('Card Payment')} title={!address.trim() ? "Please enter delivery address" : ""}>{isSubmittingOrder ? 'Processing...' : 'Pay with Card'}</button>
          <button className="zettle-cart-pay-alt" disabled={cartItems.length === 0 || isSubmittingOrder || !address.trim() || (!user && (!customerName.trim() || !customerPhone.trim()))} onClick={() => handlePlaceOrder('Cash on Delivery')} title={!address.trim() ? "Please enter delivery address" : ""}>{isSubmittingOrder ? 'Processing...' : 'Cash on Delivery'}</button>
        </div>
      </div>

      {/* Size Modal */}
      {isSizeModalOpen && selectedProductForSize && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 350 }}>
            <h3 style={{ textAlign: 'center', marginBottom: 16 }}>Select Size for {selectedProductForSize.name}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {selectedProductForSize.sizeVariants.map(variant => (
                <button key={variant.sizeName} className="action-button" style={{ fontSize: 18, padding: '10px' }} onClick={() => handleSelectSizeAndMaybeCrust(selectedProductForSize, variant)}>
                  {variant.sizeName} - Rs. {Number(variant.price).toFixed(2)}
                </button>
              ))}
              <button className="action-button" style={{ background: '#888', marginTop: 8 }} onClick={() => { setIsSizeModalOpen(false); setSelectedProductForSize(null); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Crust Modal */}
      {isCrustModalOpen && crustOptions.length > 0 && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 350 }}>
            <h3 style={{ textAlign: 'center', marginBottom: 16 }}>Select Crust</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {crustOptions.map(crust => (
                <button key={crust.name} className="action-button" style={{ fontSize: 18, padding: '10px' }} onClick={() => handleSelectCrustAndAddToCart(crust)}>
                  {crust.name} {crust.additionalPrice > 0 ? `(+Rs. ${Number(crust.additionalPrice).toFixed(2)})` : ''}
                </button>
              ))}
              <button className="action-button" style={{ background: '#888', marginTop: 8 }} onClick={() => { setIsCrustModalOpen(false); setSelectedProductForSize(null); setCrustOptions([]); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Order History Modal */}
      {showOrderHistoryModal && (
        <div className="modal-overlay" style={{ zIndex: 2000 }}>
          <div className="modal-content" style={{ maxWidth: '800px', width: '90vw', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h2 style={{ margin: 0 }}>Your Order History</h2>
              <button className="action-button" onClick={() => setShowOrderHistoryModal(false)}>Close</button>
            </div>
            {isLoadingHistory && <p>Loading history...</p>}
            {historyError && <p style={{color: 'red'}}>Error: {historyError}</p>}
            {!isLoadingHistory && !historyError && customerOrders.length === 0 && <p>You have no past orders.</p>}
            {!isLoadingHistory && !historyError && customerOrders.length > 0 && (
              <div style={{ overflowX: 'auto' }}>
                <table className="orders-table">
                  <thead><tr><th>Order ID</th><th>Date</th><th>Total</th><th>Status</th><th>Items</th></tr></thead>
                  <tbody>
                    {customerOrders.map(order => (
                      <tr key={order._id}>
                       <td>{order.orderNumber || order._id}</td>
                        <td data-label="Date">{new Date(order.createdAt).toLocaleString()}</td>
                        <td data-label="Total">Rs. {order.totalAmount.toFixed(2)}</td>
                        <td data-label="Status" className={`status-${order.status?.toLowerCase()}`}>{order.status}</td>
                        <td data-label="Items">
                          <ul style={{ margin: 0, paddingLeft: 15, listStyle: 'disc' }}>
                            {order.items.map((item, idx) => (
                              <li key={idx}>{item.name} {item.sizeName && `(${item.sizeName})`} {item.selectedCrust && item.selectedCrust.name && `[${item.selectedCrust.name}]`} (x{item.quantity})</li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerDashboard;