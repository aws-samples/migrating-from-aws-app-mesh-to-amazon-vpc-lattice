import React, { useState } from 'react';
import Modal from 'react-modal';
import './SearchModal.css';
import { API_ENDPOINTS } from "./ApiEndpoints";


const SearchModal = ({ isOpen, onClose, onProductSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  const handleSearch = async () => {
    try {
      const response = await fetch(`${API_ENDPOINTS.PRODUCTS}/search/${searchTerm}`);
      const data = await response.json();
      setSearchResults(data.searchResults);
    } catch (error) {
      console.error('Error searching products:', error);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      contentLabel="Search Products"
      className="modal"
      overlayClassName="overlay"
      setAppElement={document.getElementById('root')}
    >
      <div className="modal-content">
        <h2>Search Products</h2>
        <div className="search-container">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search products..."
          />
          <button onClick={handleSearch}>Search</button>
        </div>
        <div className="search-results">
          {searchResults.map((product) => (
            <div
              key={product.product_id}
              className="search-result-item"
              onClick={() => {
                onProductSelect(product.product_id);
                onClose();
              }}
            >
              <h3>{product.product_name}</h3>
              <p>{product.description}</p>
              <p>Price: ${product.price}</p>
            </div>
          ))}
        </div>
        <button onClick={onClose}>Close</button>
      </div>
    </Modal>
  );
};

export default SearchModal;