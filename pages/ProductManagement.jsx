import React, { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import './ProductManagement.css';

const API_PRODUCTS_URL = 'http://localhost:5001/api/products';
const API_INGREDIENTS_URL = 'http://localhost:5001/api/ingredients';

const ProductManagement = () => {
  const { token } = useContext(AuthContext);
  const [products, setProducts] = useState([]);
  const [availableIngredients, setAvailableIngredients] = useState([]);

  const initialFormState = {
    _id: '',
    name: '',
    category: '',
    image: '',
    sizeVariants: [
      {
        sizeName: 'Regular',
        price: '',
        recipe: [{ ingredient: '', quantityRequired: '' }]
      }
    ],
    crustOptions: [{ name: '', additionalPrice: '' }],
    isVisible: true,
  };
  const [form, setForm] = useState(initialFormState);

  const [isEditing, setIsEditing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formError, setFormError] = useState(null);

  // Fetch products
  const fetchProducts = useCallback(async () => {
    if (!token) return;
    setIsLoading(true); setError(null);
    try {
      const response = await fetch(`${API_PRODUCTS_URL}?adminView=true`, { headers: { 'Authorization': `Bearer ${token}` } });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status} ${(await response.json()).message}`);
      const data = await response.json();
      setProducts(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  // Fetch ingredients
  const fetchAvailableIngredients = useCallback(async () => {
    if (!token) return;
    try {
      const response = await fetch(API_INGREDIENTS_URL, { headers: { 'Authorization': `Bearer ${token}` } });
      if (!response.ok) throw new Error('Failed to fetch ingredients for recipe selection');
      const data = await response.json();
      setAvailableIngredients(data);
    } catch (err) {
      setFormError(err.message);
    }
  }, [token]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);
  useEffect(() => { if (isModalOpen) fetchAvailableIngredients(); }, [isModalOpen, fetchAvailableIngredients]);

  const resetForm = () => { setForm(initialFormState); setIsEditing(false); setFormError(null); };
  const openAddModal = () => {
    resetForm();
    setForm(prev => ({ ...prev, isVisible: true }));
    setIsModalOpen(true);
  };

  const openEditModal = (product) => {
    setForm({
      _id: product._id,
      name: product.name,
      category: product.category,
      image: product.image || '',
      isVisible: product.isVisible !== undefined ? product.isVisible : true,
      sizeVariants: product.sizeVariants && product.sizeVariants.length > 0
        ? product.sizeVariants.map(sv => ({
            sizeName: sv.sizeName,
            price: sv.price.toString(),
            recipe: sv.recipe
              ? sv.recipe.map(r => ({
                  ingredient: r.ingredient?._id || r.ingredient,
                  quantityRequired: r.quantityRequired.toString()
                }))
              : [{ ingredient: '', quantityRequired: '' }]
          }))
        : [{ sizeName: 'Regular', price: '', recipe: [{ ingredient: '', quantityRequired: '' }] }],
      crustOptions: product.crustOptions && product.crustOptions.length > 0
        ? product.crustOptions.map(co => ({
            name: co.name,
            additionalPrice: co.additionalPrice.toString()
          }))
        : [{ name: '', additionalPrice: '' }]
    });
    setIsEditing(true);
    setIsModalOpen(true);
  };
  const closeModal = () => { resetForm(); setIsModalOpen(false); };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setForm(prev => ({ ...prev, image: reader.result }));
    reader.readAsDataURL(file);
  };

  // Size Variant Handlers
  const handleSizeVariantChange = (variantIndex, field, value) => {
    const updatedVariants = form.sizeVariants.map((variant, index) =>
      index === variantIndex ? { ...variant, [field]: value } : variant
    );
    setForm(prev => ({ ...prev, sizeVariants: updatedVariants }));
  };
  const addSizeVariant = () => {
    setForm(prev => ({
      ...prev,
      sizeVariants: [...prev.sizeVariants, { sizeName: '', price: '', recipe: [{ ingredient: '', quantityRequired: '' }] }]
    }));
  };
  const removeSizeVariant = (variantIndex) => {
    if (form.sizeVariants.length <= 1) {
      setFormError("A product must have at least one size variant.");
      return;
    }
    setForm(prev => ({
      ...prev,
      sizeVariants: prev.sizeVariants.filter((_, index) => index !== variantIndex)
    }));
  };

  // Recipe Handlers (within a size variant)
  const handleRecipeChange = (variantIndex, recipeIndex, field, value) => {
    const updatedVariants = form.sizeVariants.map((variant, vIdx) => {
      if (vIdx === variantIndex) {
        const updatedRecipe = variant.recipe.map((recipeItem, rIdx) =>
          rIdx === recipeIndex ? { ...recipeItem, [field]: value } : recipeItem
        );
        return { ...variant, recipe: updatedRecipe };
      }
      return variant;
    });
    setForm(prev => ({ ...prev, sizeVariants: updatedVariants }));
  };
  const addRecipeItem = (variantIndex) => {
    const updatedVariants = form.sizeVariants.map((variant, vIdx) =>
      vIdx === variantIndex
        ? { ...variant, recipe: [...variant.recipe, { ingredient: '', quantityRequired: '' }] }
        : variant
    );
    setForm(prev => ({ ...prev, sizeVariants: updatedVariants }));
  };
  const removeRecipeItem = (variantIndex, recipeIndex) => {
    const updatedVariants = form.sizeVariants.map((variant, vIdx) => {
      if (vIdx === variantIndex) {
        return { ...variant, recipe: variant.recipe.filter((_, rIdx) => rIdx !== recipeIndex) };
      }
      return variant;
    });
    setForm(prev => ({ ...prev, sizeVariants: updatedVariants }));
  };

  // Crust Option Handlers
  const handleCrustOptionChange = (crustIndex, field, value) => {
    const updatedCrustOptions = form.crustOptions.map((crust, index) =>
      index === crustIndex ? { ...crust, [field]: value } : crust
    );
    setForm(prev => ({ ...prev, crustOptions: updatedCrustOptions }));
  };
  const addCrustOption = () => {
    setForm(prev => ({
      ...prev,
      crustOptions: [...prev.crustOptions, { name: '', additionalPrice: '' }]
    }));
  };
  const removeCrustOption = (crustIndex) => {
    setForm(prev => ({
      ...prev,
      crustOptions: prev.crustOptions.filter((_, index) => index !== crustIndex)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);
    if (!form.name || !form.category) {
      setFormError("Product name and category are required."); return;
    }
    if (!form.sizeVariants || form.sizeVariants.length === 0) {
      setFormError("Product must have at least one size variant."); return;
    }

    const validatedVariants = [];
    for (const variant of form.sizeVariants) {
      if (!variant.sizeName || !variant.price || parseFloat(variant.price) < 0) {
        setFormError(`All size variants must have a name and a valid non-negative price. Problem with: "${variant.sizeName}"`); return;
      }
      const validatedRecipe = [];
      if (variant.recipe) {
        for (const item of variant.recipe) {
          if (item.ingredient && item.quantityRequired && parseFloat(item.quantityRequired) > 0) {
            validatedRecipe.push({
              ingredient: item.ingredient,
              quantityRequired: parseFloat(item.quantityRequired)
            });
          } else if (item.ingredient || item.quantityRequired) {
            setFormError(`Incomplete recipe item for size "${variant.sizeName}". Both ingredient and positive quantity are needed if a recipe item is defined.`); return;
          }
        }
      }
      validatedVariants.push({
        sizeName: variant.sizeName,
        price: parseFloat(variant.price),
        recipe: validatedRecipe
      });
    }

    const validatedCrustOptions = [];
    if (form.crustOptions) {
      for (const crust of form.crustOptions) {
        if (crust.name && (crust.additionalPrice !== undefined && crust.additionalPrice !== '')) {
          if (parseFloat(crust.additionalPrice) < 0) {
            setFormError(`Crust option "${crust.name}" must have a non-negative additional price.`); return;
          }
          validatedCrustOptions.push({
            name: crust.name,
            additionalPrice: parseFloat(crust.additionalPrice)
          });
        } else if (crust.name || crust.additionalPrice) {
          if (crust.name && (crust.additionalPrice === undefined || crust.additionalPrice === '')) {
            setFormError(`Crust option "${crust.name}" is missing an additional price.`); return;
          }
          if (!crust.name && crust.additionalPrice) {
            setFormError(`A crust option with an additional price of "${crust.additionalPrice}" is missing a name.`); return;
          }
        }
      }
    }

    setIsLoading(true);
    const productData = {
      name: form.name,
      category: form.category,
      image: form.image,
      sizeVariants: validatedVariants,
      crustOptions: validatedCrustOptions,
      isVisible: form.isVisible,
    };

    const url = isEditing ? `${API_PRODUCTS_URL}/${form._id}` : API_PRODUCTS_URL;
    const method = isEditing ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(productData),
      });
      if (!response.ok) throw new Error((await response.json()).message || `HTTP error!`);
      fetchProducts();
      closeModal();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (productId) => {
    if (!window.confirm('Are you sure you want to remove this product?')) return;
    setIsLoading(true); setError(null);
    try {
      const response = await fetch(`${API_PRODUCTS_URL}/${productId}`, {
        method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error((await response.json()).message || 'Failed to delete');
      fetchProducts();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleProductVisibility = async (product) => {
    if (!token) {
      setError("Authentication required.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_PRODUCTS_URL}/${product._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ isVisible: !product.isVisible }),
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Failed to update product visibility');
      }
      fetchProducts();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && products.length === 0) return <p>Loading products...</p>;
  if (error) return <p style={{ color: 'red' }}>Error: {error}</p>;

  return (
    <div className="product-management dark-theme">
      <h1 style={{ textAlign: 'center', marginBottom: '20px' }}>Product Management</h1>
      <div style={{ textAlign: 'right', maxWidth: 1100, margin: '0 auto 18px auto' }}>
        <button onClick={openAddModal} className="action-button add-product-fab" disabled={isLoading}>+ Add Product</button>
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxHeight: '90vh', overflowY: 'auto', width: '90%', maxWidth: '700px' }}>
            <h2>{isEditing ? 'Edit Product' : 'Add New Product'}</h2>
            <form className="product-form" onSubmit={handleSubmit}>
              <input type="text" name="name" placeholder="Product Name" value={form.name} onChange={handleInputChange} required />
              <input type="text" name="category" placeholder="Category" value={form.category} onChange={handleInputChange} required />
              <label htmlFor="imageUploadModal" className="image-upload-label">Product Image:</label>
              <input id="imageUploadModal" type="file" accept="image/*" onChange={handleImageUpload} />
              {form.image && <img src={form.image} alt="Preview" className="preview-image" />}

              <div style={{ margin: '15px 0', display: 'flex', alignItems: 'center' }}>
                <input
                  type="checkbox"
                  id="isVisible"
                  name="isVisible"
                  checked={form.isVisible}
                  onChange={(e) => setForm(prev => ({ ...prev, isVisible: e.target.checked }))}
                  style={{ marginRight: '10px', transform: 'scale(1.2)' }}
                />
                <label htmlFor="isVisible" style={{ fontWeight: 'normal', cursor: 'pointer' }}>Product is Visible to Customers</label>
              </div>

              <h3 style={{ marginTop: '20px', marginBottom: '10px' }}>Size Variants</h3>
              {form.sizeVariants.map((variant, vIndex) => (
                <div key={vIndex} className="size-variant-section" style={{ border: '1px solid #eee', padding: '15px', marginBottom: '15px', borderRadius: '5px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h4>Size Variant #{vIndex + 1}</h4>
                    {form.sizeVariants.length > 1 &&
                      <button type="button" onClick={() => removeSizeVariant(vIndex)} className="remove-button-small">Remove Size</button>}
                  </div>
                  <input type="text" placeholder="Size Name (e.g., Small, Regular)" value={variant.sizeName} onChange={(e) => handleSizeVariantChange(vIndex, 'sizeName', e.target.value)} required style={{ width: '100%', marginBottom: '10px' }} />
                  <input type="number" placeholder="Price for this size" value={variant.price} onChange={(e) => handleSizeVariantChange(vIndex, 'price', e.target.value)} required min="0" step="0.01" style={{ width: '100%', marginBottom: '10px' }} />

                  <h5 style={{ marginTop: '10px', marginBottom: '5px' }}>Recipe for "{variant.sizeName || `Size ${vIndex + 1}`}"</h5>
                  {variant.recipe.map((item, rIndex) => {
                    const selectedIngredient = availableIngredients.find(ing => ing._id === item.ingredient);
                    return (
                      <div key={rIndex} className="recipe-item-row" style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'center' }}>
                        <select value={item.ingredient} onChange={(e) => handleRecipeChange(vIndex, rIndex, 'ingredient', e.target.value)} required style={{ flexGrow: 2, padding: '8px' }}>
                          <option value="">Select Ingredient</option>
                          {availableIngredients.map(ing => <option key={ing._id} value={ing._id}>{ing.name} ({ing.unit})</option>)}
                        </select>
                        <input type="number" placeholder="Qty Req." value={item.quantityRequired} onChange={(e) => handleRecipeChange(vIndex, rIndex, 'quantityRequired', e.target.value)} required min="0.001" step="any" style={{ flexGrow: 1, padding: '8px' }} />
                        {selectedIngredient && <span style={{ fontSize: '0.9em', color: '#555' }}>{selectedIngredient.unit}</span>}
                        <button type="button" onClick={() => removeRecipeItem(vIndex, rIndex)} className="remove-button-small">X</button>
                      </div>
                    );
                  })}
                  <button type="button" onClick={() => addRecipeItem(vIndex)} style={{ padding: '6px 10px', fontSize: '0.9em' }}>+ Add Ingredient to this Size</button>
                </div>
              ))}
              <button type="button" onClick={addSizeVariant} style={{ marginTop: '0px', marginBottom: '20px', padding: '10px 15px', background: '#5cb85c' }}>+ Add Size Variant</button>

              <h3 style={{ marginTop: '20px', marginBottom: '10px' }}>Crust Options (Optional)</h3>
              {form.crustOptions.map((crust, cIndex) => (
                <div key={cIndex} style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'center' }}>
                  <input type="text" placeholder="Crust Name (e.g., Thin Crust, Deep Pan)" value={crust.name} onChange={(e) => handleCrustOptionChange(cIndex, 'name', e.target.value)} style={{ width: '100%', marginBottom: '10px' }} />
                  <input type="number" placeholder="Additional Price (e.g., 0, 50, 100)" value={crust.additionalPrice} onChange={(e) => handleCrustOptionChange(cIndex, 'additionalPrice', e.target.value)} min="0" step="0.01" style={{ width: '100%', marginBottom: '10px' }} />
                  {form.crustOptions.length > 1 && (
                    <button type="button" onClick={() => removeCrustOption(cIndex)} className="remove-button-small">Remove</button>
                  )}
                </div>
              ))}
              <button type="button" onClick={addCrustOption} style={{ marginTop: '0px', marginBottom: '20px', padding: '10px 15px', background: '#5cb85c' }}>+ Add Crust Option</button>

              {formError && <p className="form-error" style={{ color: 'red' }}>{formError}</p>}
              <button type="submit" className="action-button" disabled={isLoading}>{isLoading ? 'Saving...' : (isEditing ? 'Update Product' : 'Add Product')}</button>
              <button type="button" className="action-button" style={{ background: '#888' }} onClick={closeModal} disabled={isLoading}>Cancel</button>
            </form>
          </div>
        </div>
      )}

      <div className="product-list">
        {products.map((product) => (
          <div key={product._id} className={`product-card ${!product.isVisible ? 'product-hidden-admin' : ''}`}>
            <img src={product.image || '/Images/default-product.jpg'} alt={product.name} />
            <p>
              <strong>{product.name}</strong> ({product.category})
              {!product.isVisible && <span style={{ color: 'red', marginLeft: '10px', fontWeight: 'bold' }}>(Hidden)</span>}
            </p>
            {product.sizeVariants && product.sizeVariants.map((sv, idx) => (
              <div key={idx} style={{ borderTop: '1px dashed #eee', marginTop: '5px', paddingTop: '5px' }}>
                <p><strong>{sv.sizeName}:</strong> Rs. {Number(sv.price).toFixed(2)}</p>
                {sv.recipe && sv.recipe.length > 0 && (
                  <div style={{ fontSize: '0.8em' }}>
                    Recipe:
                    <ul style={{ paddingLeft: '20px', margin: '5px 0' }}>
                      {sv.recipe.map((rItem, rIdx) => {
                        const ingredientObj = availableIngredients.find(ing => ing._id === (rItem.ingredient?._id || rItem.ingredient));
                        return (
                          <li key={rIdx}>
                            {ingredientObj ? ingredientObj.name : (rItem.ingredient?.name || 'N/A')}
                            : {rItem.quantityRequired} {ingredientObj ? ingredientObj.unit : (rItem.ingredient?.unit || '')}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
            ))}
            {product.crustOptions && product.crustOptions.length > 0 && (
              <div style={{ borderTop: '1px dashed #eee', marginTop: '5px', paddingTop: '5px', fontSize: '0.9em' }}>
                <strong>Crusts:</strong>
                <ul style={{ paddingLeft: '20px', margin: '5px 0', listStyleType: 'circle' }}>
                  {product.crustOptions.map((crust, idx) => (
                    <li key={idx}>
                      {crust.name} (+Rs. {Number(crust.additionalPrice).toFixed(2)})
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="product-actions">
              <button onClick={() => openEditModal(product)} disabled={isLoading}>Edit</button>
              <button
                onClick={() => toggleProductVisibility(product)}
                disabled={isLoading}
                style={{ background: product.isVisible ? '#f0ad4e' : '#5cb85c', color: 'white' }}
              >
                {product.isVisible ? 'Hide' : 'Show'}
              </button>
              <button onClick={() => handleDelete(product._id)} disabled={isLoading} style={{ background: '#dc3545', color: '#fff' }}>Remove</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProductManagement;