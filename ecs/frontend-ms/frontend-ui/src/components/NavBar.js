import React from 'react';

// NavBar Component
const NavBar = ({ onProductClick, onDirectoryClick, onArchitectureClick }) => (
  <nav className="navbar">
    <div className="navbar-left">
      <h1>IT Ordering Portal</h1>
      <ul>
        <li><a href="#home">Home</a></li>
        <li><a href="#" onClick={onProductClick}>Products</a></li>
        <li><a href="#" onClick={onDirectoryClick}>Directory</a></li>
      </ul>
    </div>
    <div className="navbar-right">
      <button onClick={onArchitectureClick} className="architecture-button">Architecture</button>
    </div>
  </nav>
);

export default NavBar;