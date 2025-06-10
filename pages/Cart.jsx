import React, { useContext } from 'react';
import { CartContext } from '../contexts/CartContext';

const Cart = () => {
  const { cartItems, removeFromCart } = useContext(CartContext);

  return (
    <div className="container mt-5">
      <h3>Your Cart</h3>
      <table className="table table-bordered mt-3">
        <thead className="table-light">
          <tr>
            <th>Item</th>
            <th>Price</th>
            <th>Remove</th>
          </tr>
        </thead>
        <tbody>
          {cartItems.map((item, index) => (
            <tr key={item.id || index}>
              <td>{item.name}</td>
              <td>Rs. {item.price}</td>
              <td>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => removeFromCart(item.id)}
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <h5>
        Total: Rs. {cartItems.reduce((sum, item) => sum + Number(item.price), 0)}
      </h5>
    </div>
  );
};

export default Cart;