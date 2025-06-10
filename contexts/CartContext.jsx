import React, { createContext, useState, useCallback } from 'react';

export const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);

  // Add item to cart or increment quantity if it already exists
  const addToCart = useCallback((productToAdd) => {
    setCartItems((prevItems) => {
      // Ensure productToAdd has an _id, name, and price
      if (!productToAdd._id || !productToAdd.name || typeof productToAdd.price === 'undefined') {
        console.error("Product being added to cart is missing essential properties (_id, name, price):", productToAdd);
        return prevItems; // Return previous items to avoid breaking the cart
      }

      const existingItem = prevItems.find((item) => item._id === productToAdd._id);

      if (existingItem) {
        // If item exists, map through and update its quantity
        return prevItems.map((item) =>
          item._id === productToAdd._id
            ? { ...item, quantity: (item.quantity || 0) + 1 }
            : item
        );
      } else {
        // If item doesn't exist, add it to the cart with quantity 1
        // Also include any other properties passed in productToAdd (like selectedSize, selectedCrust if used)
        return [...prevItems, { ...productToAdd, quantity: 1 }];
      }
    });
  }, []);

  // Remove item from cart or decrement quantity
  const removeFromCart = useCallback((productIdToRemove) => {
    setCartItems((prevItems) => {
      const existingItem = prevItems.find((item) => item._id === productIdToRemove);

      if (existingItem && existingItem.quantity > 1) {
        // If quantity > 1, decrement quantity
        return prevItems.map((item) =>
          item._id === productIdToRemove
            ? { ...item, quantity: item.quantity - 1 }
            : item
        );
      } else {
        // If quantity is 1 or item not found (though it should be), remove it
        return prevItems.filter((item) => item._id !== productIdToRemove);
      }
    });
  }, []);

  // Clear all items from the cart
  const clearCart = useCallback(() => {
    setCartItems([]);
  }, []);
  
  // Note: Product fetching and management (products, saveProduct, removeProduct)
  // and order placement (placeOrder, orders) are now handled by components
  // interacting directly with the backend API (e.g., ProductManagement.jsx, POS.jsx).
  // This CartContext will focus solely on managing the client-side cart state.

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        clearCart,
        // products and orders related states/functions are removed
        // as they are now managed by backend API calls in respective components.
      }}
    >
      {children}
    </CartContext.Provider>
  );
};