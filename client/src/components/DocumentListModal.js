import React, { useState, useEffect, useRef } from "react";
import "./DocumentListModal.css";
const API_BASE = process.env.REACT_APP_API_URL || "";
const DocumentListModal = ({
  isOpen,
  onClose,
  onSelectDocument,
  token,
  onDocumentRenamed,
}) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editingName, setEditingName] = useState(null);
  const [editNameValue, setEditNameValue] = useState("");
  const justStartedEditingRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      fetchDocuments();
    }
  }, [isOpen, token]);

  const fetchDocuments = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE}/api/documents`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setDocuments(data);
      } else {
        setError(data.error || "Failed to load documents");
      }
    } catch (error) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleDocumentClick = (doc) => {
    onSelectDocument(doc);
    onClose();
  };

  const handleDelete = async (e, docId) => {
    e.stopPropagation();

    if (!window.confirm("Are you sure you want to delete this document?")) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/documents/${docId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        fetchDocuments();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to delete document");
      }
    } catch (error) {
      alert("Network error. Please try again.");
    }
  };

  const handleStartRename = (e, doc) => {
    e.stopPropagation();
    setEditingName(doc.id);
    setEditNameValue(doc.name || "Untitled Document");
    justStartedEditingRef.current = true;
    // Clear the flag after a short delay to allow typing
    setTimeout(() => {
      justStartedEditingRef.current = false;
    }, 200);
  };

  const handleSaveRename = async (docId) => {
    // Prevent saving immediately after clicking to edit
    if (justStartedEditingRef.current) {
      justStartedEditingRef.current = false;
      return;
    }

    const trimmedName = editNameValue.trim() || "Untitled Document";

    try {
      // Get current document content first
      const getResponse = await fetch(`${API_BASE}/api/documents/${docId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!getResponse.ok) {
        throw new Error("Failed to fetch document");
      }

      const docData = await getResponse.json();

      // Update document with new name
      const response = await fetch(`${API_BASE}/api/documents/${docId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: docData.content,
          name: trimmedName,
        }),
      });

      onDocumentRenamed(trimmedName);

      if (response.ok) {
        setEditingName(null);
        fetchDocuments();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to rename document");
      }
    } catch (error) {
      alert("Network error. Please try again.");
    }
  };

  const handleCancelRename = () => {
    setEditingName(null);
    setEditNameValue("");
    justStartedEditingRef.current = false;
  };

  const handleRenameKeyDown = (e, docId) => {
    if (e.key === "Enter") {
      justStartedEditingRef.current = false;
      handleSaveRename(docId);
    } else if (e.key === "Escape") {
      handleCancelRename();
    }
  };

  const handleRenameInputFocus = (e) => {
    // Select all text when focusing
    e.target.select();
    // Mark that we're editing to prevent focus stealing
    document.body.setAttribute("data-editing-name", "true");
  };

  const handleRenameInputBlur = (docId) => {
    // Remove the flag when done editing
    document.body.removeAttribute("data-editing-name");
    handleSaveRename(docId);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">My Documents</h2>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          {loading && <div className="modal-loading">Loading documents...</div>}
          {error && <div className="modal-error">{error}</div>}

          {!loading && !error && documents.length === 0 && (
            <div className="modal-empty">
              No documents yet. Start typing to create one!
            </div>
          )}

          {!loading && !error && documents.length > 0 && (
            <div className="document-list">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="document-item"
                  onClick={() => !editingName && handleDocumentClick(doc)}
                >
                  <div className="document-info">
                    {editingName === doc.id ? (
                      <input
                        type="text"
                        value={editNameValue}
                        onChange={(e) => setEditNameValue(e.target.value)}
                        onBlur={() => handleRenameInputBlur(doc.id)}
                        onKeyDown={(e) => handleRenameKeyDown(e, doc.id)}
                        onFocus={handleRenameInputFocus}
                        className="document-name-edit"
                        autoFocus
                        maxLength={50}
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <>
                        <div
                          className="document-name"
                          onClick={(e) => handleStartRename(e, doc)}
                        >
                          {doc.name || "Untitled Document"}
                          <span
                            className="document-rename-icon"
                            title="Click to rename"
                          >
                            ✎
                          </span>
                        </div>
                        <div className="document-preview">
                          {doc.content.substring(0, 100)}
                          {doc.content.length > 100 && "..."}
                        </div>
                        <div className="document-meta">
                          <span className="document-date">
                            Updated: {formatDate(doc.updated_at)}
                          </span>
                          {doc.created_at !== doc.updated_at && (
                            <span className="document-date">
                              Created: {formatDate(doc.created_at)}
                            </span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                  {editingName !== doc.id && (
                    <button
                      className="document-delete"
                      onClick={(e) => handleDelete(e, doc.id)}
                      title="Delete document"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentListModal;
