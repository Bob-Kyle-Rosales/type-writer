import React from 'react';
import './ControlPanel.css';

const ControlPanel = ({ onSave, onClear, onReset, onLogout, username }) => {
  return (
    <div className="control-panel">
      <div className="control-panel-content">
        <h2 className="panel-title">Typewriter</h2>
        {username && (
          <div className="panel-user">
            <span className="user-label">User:</span>
            <span className="user-name">{username}</span>
          </div>
        )}
        <div className="control-buttons">
          <button 
            className="control-btn save-btn" 
            onClick={onSave}
            title="Save Document"
          >
            Save
          </button>
          <button 
            className="control-btn clear-btn" 
            onClick={onClear}
            title="Clear Document"
          >
            Clear
          </button>
          <button 
            className="control-btn reset-btn" 
            onClick={onReset}
            title="Reset to Fresh Paper"
          >
            Reset
          </button>
          {onLogout && (
            <button 
              className="control-btn logout-btn" 
              onClick={onLogout}
              title="Logout"
            >
              Logout
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;

