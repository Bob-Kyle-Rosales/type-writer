import React from 'react';
import './DocumentListButton.css';

const DocumentListButton = ({ onClick }) => {
  return (
    <button className="document-list-button" onClick={onClick} title="View Documents">
      <span className="button-icon">📄</span>
      <span>Documents</span>
    </button>
  );
};

export default DocumentListButton;

