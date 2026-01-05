import React, { useState, useEffect, useRef } from "react";
import "./DocumentName.css";

const API_BASE = process.env.REACT_APP_API_URL || "";

const DocumentName = ({
  documentName,
  documentId,
  onNameChange,
  token,
  content,
}) => {
  const [name, setName] = useState(documentName || "Untitled Document");
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState(name);
  const inputRef = useRef(null);
  const justStartedEditingRef = useRef(false);

  useEffect(() => {
    setName(documentName || "Untitled Document");
    setTempName(documentName || "Untitled Document");
  }, [documentName]);

  const handleSave = async () => {
    // Prevent saving immediately after clicking to edit
    if (justStartedEditingRef.current) {
      justStartedEditingRef.current = false;
      return;
    }

    const trimmedName = tempName.trim() || "Untitled Document";
    setName(trimmedName);
    setIsEditing(false);

    if (documentId && token) {
      try {
        // Update document name via API (preserve content)
        const response = await fetch(
          `${API_BASE}/api/documents/${documentId}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              content: content || "", // Preserve existing content
              name: trimmedName,
            }),
          }
        );

        if (response.ok) {
          onNameChange(trimmedName);
        }
      } catch (error) {
        console.error("Error updating document name:", error);
        // Revert on error
        setName(name);
        setTempName(name);
      }
    } else {
      onNameChange(trimmedName);
    }
  };

  const handleCancel = () => {
    setTempName(name);
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      justStartedEditingRef.current = false;
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  const handleStartEdit = () => {
    setIsEditing(true);
    justStartedEditingRef.current = true;
    // Clear the flag after a short delay to allow typing
    setTimeout(() => {
      justStartedEditingRef.current = false;
    }, 200);
  };

  const handleInputFocus = () => {
    // Select all text when focusing
    if (inputRef.current) {
      inputRef.current.select();
    }
    // Mark that we're editing to prevent focus stealing
    document.body.setAttribute("data-editing-name", "true");
  };

  const handleInputBlur = () => {
    // Remove the flag when done editing
    document.body.removeAttribute("data-editing-name");
    handleSave();
  };

  if (isEditing) {
    return (
      <div className="document-name-editor">
        <input
          ref={inputRef}
          type="text"
          value={tempName}
          onChange={(e) => setTempName(e.target.value)}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          onFocus={handleInputFocus}
          className="document-name-input"
          autoFocus
          maxLength={50}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    );
  }

  return (
    <div
      className="document-name-display"
      onClick={handleStartEdit}
      title="Click to rename"
    >
      <span className="document-name-text">{name}</span>
      <span className="document-name-edit-icon">✎</span>
    </div>
  );
};

export default DocumentName;
