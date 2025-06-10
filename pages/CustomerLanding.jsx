import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { CartContext } from '../contexts/CartContext';
import './CustomerLanding.css';

const CustomerLanding = () => {
  const { products } = useContext(CartContext);
  const navigate = useNavigate();

  // Group products by category
  const productsByCategory = Array.isArray(products)
    ? products.reduce((acc, product) => {
        if (!acc[product.category]) acc[product.category] = [];
        if (product.isActive) acc[product.category].push(product);
        return acc;
      }, {})
    : {};

  return (
    <div className="customer-landing-root">
      <header className="customer-landing-header">
        <img src="/Images/madpizzalogo.png" alt="Mad Pizza Logo" className="landing-logo" />
        <div className="landing-auth-btns">
          <button className="landing-btn" onClick={() => navigate('/login')}>Login</button>
        </div>
      </header>
      <section className="landing-hero">
        <h1>Welcome to Mad Pizza!</h1>
        <p>Order your favorite pizza and more, delivered to your door.</p>
      </section>
      <section className="landing-products">
        <h2>Menu</h2>
        {Object.entries(productsByCategory).map(([category, items]) => (
          <div key={category} className="landing-category">
            <h3>{category}</h3>
            <div className="landing-product-list">
              {items.map(product => (
                <div key={product.id} className="landing-product-card">
                  <img src={product.img || '/images/default-product.jpg'} alt={product.name} />
                  <div className="landing-product-info">
                    <div className="landing-product-name">{product.name}</div>
                    <div className="landing-product-price">
                      {product.sizes
                        ? <>
                            {product.sizes.large && <span>Large: Rs. {product.sizes.large}<br /></span>}
                            {product.sizes.medium && <span>Medium: Rs. {product.sizes.medium}<br /></span>}
                            {product.sizes.small && <span>Small: Rs. {product.sizes.small}</span>}
                          </>
                        : <>Rs. {product.price}</>
                      }
                    </div>
                  </div>
                  <button className="landing-btn" onClick={() => navigate('/login')}>
                    Order Now
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>
      <footer className="customer-landing-footer">
        <p>2025 Mad Pizza. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default CustomerLanding;