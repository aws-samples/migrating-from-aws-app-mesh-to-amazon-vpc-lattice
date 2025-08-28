import React, { useState } from 'react';
import { API_ENDPOINTS } from './ApiEndpoints';
import './ProductList.css';


// TableHeader.js
const TableHeader = () => (
  <thead>
    <tr>
      <th>ID</th>
      <th>Name</th>
      {/* <th>Description</th> */}
      <th>Price</th>
    </tr>
  </thead>
);

// TableRow.js
const TableRow = ({ user: product, onCopyId }) => (
  <tr key={product.product_id}>
    <td>
      {product.product_id}
      <button
        onClick={() => onCopyId(product.product_id)}
        className="copy-button"
        aria-label={`Copy ID ${product.product_id}`}
      >
        Copy
      </button>
    </td>
    <td>{product.product_name}</td>
    {/* <td>{product.description}</td> */}
    <td>{product.price}</td>
  </tr>
);

// ProductList Component
const ProductList = ({ products, onBack }) => {
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');

  const handleSearchModalOpen = () => setIsSearchModalOpen(true);
  const handleSearchModalClose = () => setIsSearchModalOpen(false);
  const handleProductSelect = (productId) => {
    setSelectedProductId(productId);
    setIsSearchModalOpen(false);
  };

const handleCopyToClipboard = async (userId) => {
  try {
    await navigator.clipboard.writeText(userId);
    // Optional: Add toast notification or feedback
  } catch (err) {
    console.error('Failed to copy:', err);
  }
};

return (
  <div className="product-list-container">
    <div className="product-list-header">
      <button onClick={onBack} className="back-button">Back to Home</button>
      {selectedProductId && (
        <div className="selected-product">
          Selected Product ID: {selectedProductId}
        </div>
      )}
    </div>
    <table className="product-table">
      <TableHeader />
      <tbody>
        {products.map(product => (
          <TableRow
            key={product.product_id}
            user={product}
            onCopyId={handleCopyToClipboard}
          />
        ))}
      </tbody>
    </table>


  </div>
);



}

export default ProductList;