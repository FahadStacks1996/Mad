import React, { useContext, useState, useEffect, useRef } from 'react';
import { CartContext } from '../contexts/CartContext';
import './POS.css';

const API_PRODUCTS_URL = 'http://localhost:5001/api/products';
const API_ORDERS_URL = 'http://localhost:5001/api/orders';
const API_USERS_URL = 'http://localhost:5001/api/users';

const POS = () => {
  const { cartItems, addToCart, removeFromCart, clearCart } = useContext(CartContext);

  const [posProducts, setPosProducts] = useState([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [productError, setProductError] = useState(null);

  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [orderError, setOrderError] = useState(null);
  const [orderSuccess, setOrderSuccess] = useState(null);

  const [printData, setPrintData] = useState(null);

  // Customer info
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerId, setCustomerId] = useState(null);
  const [customerAddresses, setCustomerAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [showAddAddress, setShowAddAddress] = useState(false);

  // Search state
  const [searching, setSearching] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);

  // For size and crust selection modals
  const [isSizeModalOpen, setIsSizeModalOpen] = useState(false);
  const [selectedProductForSize, setSelectedProductForSize] = useState(null);
  const [isCrustModalOpen, setIsCrustModalOpen] = useState(false);
  const [crustOptions, setCrustOptions] = useState([]);

  const printRef = useRef();

  // Fetch products
  useEffect(() => {
    setIsLoadingProducts(true);
    setProductError(null);
    fetch(API_PRODUCTS_URL)
      .then(res => res.json())
      .then(data => setPosProducts(Array.isArray(data) ? data : data.products || []))
      .catch(err => setProductError(err.message))
      .finally(() => setIsLoadingProducts(false));
  }, []);

  const productsArray = Array.isArray(posProducts) ? posProducts : [];
  const productsByCategory = productsArray.reduce((acc, product) => {
    if (!acc[product.category]) acc[product.category] = [];
    acc[product.category].push(product);
    return acc;
  }, {});

  // --- Customer Search ---
  const handleSearchCustomer = async () => {
    setSearching(true);
    setOrderError(null);
    setCustomerId(null);
    setCustomerName('');
    setCustomerAddresses([]);
    setSelectedAddress('');
    try {
      const res = await fetch(`${API_USERS_URL}/by-phone/${encodeURIComponent(customerPhone.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setCustomerId(data._id);
        setCustomerName(data.firstName || '');
        setCustomerAddresses(data.addresses || []);
        setSelectedAddress((data.addresses && data.addresses[0]) || '');
        setOrderError(null);
      } else {
        setCustomerId(null);
        setCustomerName('');
        setCustomerAddresses([]);
        setSelectedAddress('');
        setShowCustomerModal(true);
      }
    } catch (err) {
      setOrderError('Error searching customer');
    } finally {
      setSearching(false);
    }
  };

  // --- Customer Modal Submit ---
  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    if (!customerName.trim() || !newAddress.trim()) {
      setOrderError('Name and address are required for new customer.');
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`${API_USERS_URL}/pos-signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: customerName.trim(),
          phone: customerPhone.trim(),
          address: newAddress.trim(),
          password: Math.random().toString(36).slice(-8)
        }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to create customer');
      }
      const data = await res.json();
      setCustomerId(data._id);
      setCustomerAddresses(data.addresses || [newAddress.trim()]);
      setSelectedAddress(newAddress.trim());
      setShowCustomerModal(false);
      setOrderError(null);
    } catch (err) {
      setOrderError('Failed to create customer: ' + err.message);
    } finally {
      setSearching(false);
    }
  };

  // --- Add New Address for Existing Customer ---
  const handleAddAddress = async (e) => {
    e.preventDefault();
    if (!newAddress.trim() || !customerId) return;
    setSearching(true);
    try {
      const res = await fetch(`${API_USERS_URL}/add-address`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          address: newAddress.trim(),
        }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to add address');
      }
      const data = await res.json();
      setCustomerAddresses(data.addresses || []);
      setSelectedAddress(newAddress.trim());
      setShowAddAddress(false);
      setNewAddress('');
      setOrderError(null);
    } catch (err) {
      setOrderError('Failed to add address: ' + err.message);
    } finally {
      setSearching(false);
    }
  };

  // --- Place Order ---
  const totalPrice = cartItems.reduce((sum, item) => sum + (Number(item.price) * (item.quantity || 1)), 0);

  const handlePlaceOrder = async (chosenPaymentMethod) => {
    setOrderError(null);
    setOrderSuccess(null);

    if (!customerName.trim() || !customerPhone.trim() || !selectedAddress.trim()) {
      setOrderError("Customer name, phone, and address are required.");
      return;
    }
    if (cartItems.length === 0) {
      setOrderError("Cart is empty.");
      return;
    }

    setIsSubmittingOrder(true);

    let userId = customerId;
    if (!userId) {
      setOrderError("Please search for customer and create if not found.");
      setIsSubmittingOrder(false);
      return;
    }

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
      customerName: customerName.trim(),
      paymentMethod: chosenPaymentMethod,
      status: 'Completed',
      userId,
      deliveryAddress: selectedAddress.trim(),
      customerPhone: customerPhone.trim(),
    };

    try {
      const response = await fetch(API_ORDERS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      });
      const responseData = await response.json();
      if (!response.ok) throw new Error(responseData.message || `HTTP error! status: ${response.status}`);
      setOrderSuccess(`Order ${responseData._id || ''} placed successfully!`);
      clearCart();
      setPrintData(responseData);
      setTimeout(() => setOrderSuccess(''), 5000);
      setTimeout(() => {
        if (printRef.current) {
          window.print();
        }
      }, 500);
    } catch (err) {
      setOrderError(err.message);
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // --- Size/Crust selection handlers (unchanged) ---
  const handleProductClick = (product) => {
    if (product.sizeVariants && product.sizeVariants.length > 0) {
      setSelectedProductForSize(product);
      setIsSizeModalOpen(true);
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
      _id: `${product._id}_${product.selectedSize}_${crust.name}`,
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

  // --- Print Styles ---
  useEffect(() => {
    if (printData) {
      const handler = () => setPrintData(null);
      window.addEventListener('afterprint', handler);
      return () => window.removeEventListener('afterprint', handler);
    }
  }, [printData]);

  return (
    <div className="zettle-root">
      <div className="zettle-products">
        <div className="zettle-header">
          <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="text"
              placeholder="Phone Number"
              value={customerPhone}
              onChange={e => setCustomerPhone(e.target.value.replace(/[^0-9+]/g, ''))}
              style={{ padding: '8px', width: '180px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
              required
            />
            <button
              className="action-button"
              style={{ padding: '8px 16px', fontWeight: 600 }}
              onClick={handleSearchCustomer}
              disabled={searching || !customerPhone.trim()}
              type="button"
            >
              {searching ? 'Searching...' : 'Search'}
            </button>
            {customerId && <span style={{ color: '#388e3c', marginLeft: 10 }}>Customer found</span>}
          </div>
          <div style={{ marginBottom: 10 }}>
            <input
              type="text"
              placeholder="Customer Name"
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              style={{ padding: '8px', margin: '0 10px 10px 0', width: '30%', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
              required
              disabled={!!customerId}
            />
            {customerId && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <select
                  value={selectedAddress}
                  onChange={e => setSelectedAddress(e.target.value)}
                  style={{ padding: '8px', width: '40%', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
                >
                  {customerAddresses.map((addr, idx) => (
                    <option key={idx} value={addr}>{addr}</option>
                  ))}
                </select>
                <button className="action-button" style={{ padding: '8px 12px' }} type="button" onClick={() => setShowAddAddress(true)}>+ Add Address</button>
              </div>
            )}
            {!customerId && (
              <input
                type="text"
                placeholder="Address"
                value={selectedAddress}
                onChange={e => setSelectedAddress(e.target.value)}
                style={{ padding: '8px', margin: '0 10px 10px 0', width: '40%', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
                required
              />
            )}
          </div>
        </div>
        {isLoadingProducts && <p style={{textAlign: 'center'}}>Loading products...</p>}
        {productError && <p style={{textAlign: 'center', color: 'red'}}>Error: {productError}</p>}

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
        <div className="zettle-cart-title">Cart</div>
        {orderError && <p style={{ color: 'red', textAlign: 'center' }}>{orderError}</p>}
        {orderSuccess && <p style={{ color: 'green', textAlign: 'center' }}>{orderSuccess}</p>}
        <div className="zettle-cart-list">
          {cartItems.length === 0 && <div className="zettle-cart-empty">No items in cart</div>}
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
          <div className="zettle-cart-total-row">
            <span>Total</span>
            <span className="zettle-cart-total">Rs. {totalPrice.toFixed(2)}</span>
          </div>
          <button className="zettle-cart-pay" disabled={cartItems.length === 0 || isSubmittingOrder || !customerName.trim() || !customerPhone.trim() || !selectedAddress.trim() || !customerId} onClick={() => handlePlaceOrder('Cash')}>
            {isSubmittingOrder ? 'Processing...' : 'Cash Register'}
          </button>
          <button className="zettle-cart-pay-alt" disabled={cartItems.length === 0 || isSubmittingOrder || !customerName.trim() || !customerPhone.trim() || !selectedAddress.trim() || !customerId} onClick={() => handlePlaceOrder('Card')}>
            {isSubmittingOrder ? 'Processing...' : 'Card Payment'}
          </button>
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

      {/* New Customer Modal */}
      {showCustomerModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 350 }}>
            <h3 style={{ textAlign: 'center', marginBottom: 16 }}>New Customer</h3>
            <form onSubmit={handleCreateCustomer}>
              <input
                type="text"
                placeholder="Customer Name"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                style={{ padding: '8px', marginBottom: 10, width: '100%', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
                required
              />
              <input
                type="text"
                placeholder="Address"
                value={newAddress}
                onChange={e => setNewAddress(e.target.value)}
                style={{ padding: '8px', marginBottom: 10, width: '100%', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
                required
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" className="action-button" style={{ background: '#888' }} onClick={() => setShowCustomerModal(false)}>Cancel</button>
                <button type="submit" className="action-button" disabled={searching}>{searching ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Address Modal */}
      {showAddAddress && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 350 }}>
            <h3 style={{ textAlign: 'center', marginBottom: 16 }}>Add New Address</h3>
            <form onSubmit={handleAddAddress}>
              <input
                type="text"
                placeholder="New Address"
                value={newAddress}
                onChange={e => setNewAddress(e.target.value)}
                style={{ padding: '8px', marginBottom: 10, width: '100%', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
                required
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" className="action-button" style={{ background: '#888' }} onClick={() => setShowAddAddress(false)}>Cancel</button>
                <button type="submit" className="action-button" disabled={searching}>{searching ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Print Area */}
     {printData && (
  <div
    className="print-area receipt-print"
    ref={printRef}
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
      <b>Order:</b> {printData.orderNumber || printData._id}<br />
      <b>Date:</b> {new Date(printData.timestamp || printData.createdAt).toLocaleString()}<br />
      <b>Name:</b> {printData.customerName}<br />
      <b>Phone:</b> {printData.customerPhone || '-'}<br />
      <b>Address:</b> {printData.deliveryAddress || '-'}<br />
      <b>Payment:</b> {printData.paymentMethod}
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
        {printData.items.map((item, idx) => (
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
      Total: Rs. {Number(printData.totalAmount).toFixed(0)}
    </div>
    <div style={{ textAlign: 'center', fontSize: 10, margin: '6px 0 0 0' }}>
      --- Thank you! ---
    </div>
  </div>
)}
    </div>
  );
};

export default POS;