import React, { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import './InventoryManagement.css'; // Use the new CSS file

const API_INGREDIENTS_URL = 'http://localhost:5001/api/ingredients';

const InventoryManagement = () => {
  const { token } = useContext(AuthContext);
  const [ingredients, setIngredients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentIngredient, setCurrentIngredient] = useState({
    _id: null,
    name: '',
    unit: '',
    stockQuantity: 0,
    lowStockThreshold: 0,
  });
  const [formError, setFormError] = useState(null);

  const [stockUpdateModal, setStockUpdateModal] = useState({ open: false, ingredient: null, newStock: '' });

  const fetchIngredients = useCallback(async () => {
    if (!token) {
        setError("Authentication required to view ingredients. Please ensure you are logged in as an admin.");
        setIsLoading(false);
        setIngredients([]);
        return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(API_INGREDIENTS_URL, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || `Failed to fetch ingredients (Status: ${response.status})`);
      }
      const data = await response.json();
      setIngredients(data);
    } catch (err) {
      console.error("Fetch ingredients error:", err);
      setError(err.message);
      setIngredients([]);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchIngredients();
  }, [fetchIngredients]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCurrentIngredient(prev => ({ ...prev, [name]: name === 'stockQuantity' || name === 'lowStockThreshold' ? Number(value) : value }));
  };

  const resetForm = () => {
    setIsEditing(false);
    setCurrentIngredient({ _id: null, name: '', unit: '', stockQuantity: 0, lowStockThreshold: 0 });
    setFormError(null);
  };

  const openAddModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (ingredient) => {
    setIsEditing(true);
    setCurrentIngredient({ ...ingredient });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentIngredient.name || !currentIngredient.unit) {
      setFormError("Ingredient name and unit are required.");
      return;
    }
    if (!isEditing && (currentIngredient.stockQuantity === undefined || currentIngredient.stockQuantity < 0)) {
        setFormError("Initial stock quantity must be a non-negative number.");
        return;
    }
    if (currentIngredient.lowStockThreshold < 0) {
        setFormError("Low stock threshold cannot be negative.");
        return;
    }
    setFormError(null);
    setIsLoading(true);

    const url = isEditing ? `${API_INGREDIENTS_URL}/${currentIngredient._id}` : API_INGREDIENTS_URL;
    const method = isEditing ? 'PUT' : 'POST';
    
    const payload = {
        name: currentIngredient.name,
        unit: currentIngredient.unit,
        lowStockThreshold: Number(currentIngredient.lowStockThreshold) || 0,
    };
    if (!isEditing) {
        payload.stockQuantity = Number(currentIngredient.stockQuantity) || 0;
    }

    try {
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || `Failed to ${isEditing ? 'update' : 'add'} ingredient`);
      }
      fetchIngredients();
      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (ingredientId) => {
    if (!window.confirm('Are you sure you want to delete this ingredient? This action cannot be undone.')) return;
    setIsLoading(true); 
    setError(null);
    try {
      const response = await fetch(`${API_INGREDIENTS_URL}/${ingredientId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Failed to delete ingredient');
      }
      fetchIngredients();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Stock update modal handlers
  const openStockUpdateModal = (ingredient) => {
    setStockUpdateModal({ open: true, ingredient, newStock: ingredient.stockQuantity.toString() });
    setFormError(null);
  };
  const closeStockUpdateModal = () => {
    setStockUpdateModal({ open: false, ingredient: null, newStock: '' });
  };
  const handleStockUpdateChange = (e) => {
    setStockUpdateModal(prev => ({ ...prev, newStock: e.target.value }));
  };
  const handleSaveStockUpdate = async () => {
    if (!stockUpdateModal.ingredient || stockUpdateModal.newStock === '') {
        setFormError("New stock quantity cannot be empty.");
        return;
    }
    const newStockValue = parseFloat(stockUpdateModal.newStock);
    if (isNaN(newStockValue) || newStockValue < 0) {
        setFormError("Invalid stock quantity. Must be a non-negative number.");
        return;
    }
    setFormError(null);
    setIsLoading(true);
    try {
        const response = await fetch(`${API_INGREDIENTS_URL}/${stockUpdateModal.ingredient._id}/stock`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ stockQuantity: newStockValue }),
        });
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.message || 'Failed to update stock');
        }
        fetchIngredients();
        closeStockUpdateModal();
    } catch (err) {
        setFormError(err.message);
    } finally {
        setIsLoading(false);
    }
  };

  // Main page content rendering
  const renderPageContent = () => (
    <>
      <div style={{ textAlign: 'right', maxWidth: 1100, margin: '0 auto 18px auto' }}>
        <button onClick={openAddModal} className="action-button add-product-fab" disabled={isLoading}>
          + Add Ingredient
        </button>
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>{isEditing ? 'Edit Ingredient' : 'Add New Ingredient'}</h2>
            {formError && <p className="form-error" style={{color: 'red', marginBottom: '10px'}}>{formError}</p>}
            <form onSubmit={handleSubmit} className="product-form">
              <input type="text" name="name" value={currentIngredient.name} onChange={handleInputChange} placeholder="Ingredient Name (e.g., Flour, Cheese)" required />
              <input type="text" name="unit" value={currentIngredient.unit} onChange={handleInputChange} placeholder="Unit (e.g., grams, ml, pcs)" required />
              {!isEditing && (
                <input type="number" name="stockQuantity" value={currentIngredient.stockQuantity} onChange={handleInputChange} placeholder="Initial Stock Quantity" min="0" required />
              )}
              <input type="number" name="lowStockThreshold" value={currentIngredient.lowStockThreshold} onChange={handleInputChange} placeholder="Low Stock Threshold (Optional)" min="0" />
              
              <button type="submit" className="action-button" disabled={isLoading}>
                {isLoading ? 'Saving...' : (isEditing ? 'Update Ingredient' : 'Add Ingredient')}
              </button>
              <button type="button" className="action-button" style={{ background: '#888' }} onClick={() => setIsModalOpen(false)} disabled={isLoading}>
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}

      {stockUpdateModal.open && stockUpdateModal.ingredient && (
         <div className="modal-overlay">
            <div className="modal-content">
                <h2>Update Stock for {stockUpdateModal.ingredient.name}</h2>
                <p>Current Stock: {stockUpdateModal.ingredient.stockQuantity} {stockUpdateModal.ingredient.unit}</p>
                {formError && <p className="form-error" style={{color: 'red', marginBottom: '10px'}}>{formError}</p>}
                <input 
                    type="number" 
                    value={stockUpdateModal.newStock}
                    onChange={handleStockUpdateChange}
                    placeholder="New Stock Quantity"
                    min="0"
                    style={{width: '100%', padding: '10px', marginBottom: '10px', boxSizing: 'border-box'}}
                />
                <button onClick={handleSaveStockUpdate} className="action-button" disabled={isLoading}>
                    {isLoading ? "Saving..." : "Save New Stock"}
                </button>
                <button type="button" className="action-button" style={{ background: '#888' }} onClick={closeStockUpdateModal} disabled={isLoading}>
                    Cancel
                </button>
            </div>
         </div>
      )}

      <div className="product-list" style={{marginTop: '20px'}}>
        {ingredients.length === 0 && !isLoading && !error && <p>No ingredients found. Add some to get started.</p>}
        {ingredients.map(ing => (
          <div key={ing._id} className="product-card">
            <h3>{ing.name}</h3>
            <p>Stock: {ing.stockQuantity} {ing.unit}</p>
            <p>Low Stock At: {ing.lowStockThreshold} {ing.unit}</p>
            <div className="product-actions">
              <button onClick={() => openEditModal(ing)} disabled={isLoading}>Edit Details</button>
              <button onClick={() => openStockUpdateModal(ing)} disabled={isLoading} style={{background: '#28a745'}}>Update Stock</button>
              <button onClick={() => handleDelete(ing._id)} disabled={isLoading} style={{ background: '#dc3545', color: '#fff' }}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </>
  );

  return (
    <div className="product-management dark-theme">
      <h1 style={{ textAlign: 'center', marginBottom: '20px' }}>Inventory Management</h1>
      {isLoading && <p style={{textAlign: 'center'}}>Loading ingredients...</p>}
      {error && <p style={{textAlign: 'center', color: 'red'}}>Error: {error}</p>}
      {!isLoading && !error && renderPageContent()}
    </div>
  );
};

export default InventoryManagement;