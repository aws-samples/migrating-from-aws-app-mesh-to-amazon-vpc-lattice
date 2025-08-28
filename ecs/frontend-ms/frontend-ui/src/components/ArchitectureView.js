import React from "react";
import polyglotLattice from '../polyglot-lattice.png'; // Import the image


export const ArchitectureView = ({ onBack }) => (
    <div className="architecture-view">
      <button onClick={onBack} className="back-button">Back to Home</button>
      <h2>System Architecture</h2>
      <div className="architecture-diagram">
        <img src={polyglotLattice} alt="Polyglot Lattice Architecture Diagram" />
      </div>
    </div>
  );