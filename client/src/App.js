import React, { useState, useEffect } from "react";
import TypewriterEditor from "./components/TypewriterEditor";
import ControlPanel from "./components/ControlPanel";
import Login from "./components/Login";
import Register from "./components/Register";
import DocumentListModal from "./components/DocumentListModal";
import DocumentListButton from "./components/DocumentListButton";
import DocumentName from "./components/DocumentName";
import "./App.css";
const API_BASE = process.env.REACT_APP_API_URL || "";

function App() {
  const [content, setContent] = useState("");
  const [documentId, setDocumentId] = useState(null);
  const [documentName, setDocumentName] = useState("Untitled Document");
  const [isReady, setIsReady] = useState(true);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [showAuth, setShowAuth] = useState("login"); // 'login' or 'register'
  const [showDocumentList, setShowDocumentList] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(true);

  // Check for existing authentication on mount
  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");

    if (savedToken && savedUser) {
      // Verify token is still valid
      fetch(`${API_BASE}/api/auth/verify`, {
        headers: {
          Authorization: `Bearer ${savedToken}`,
        },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.user) {
            setToken(savedToken);
            setUser(JSON.parse(savedUser));
          } else {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
          }
        })
        .catch(() => {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
        })
        .finally(() => {
          setIsAuthenticating(false);
        });
    } else {
      setIsAuthenticating(false);
    }
  }, []);

  // Load latest document when authenticated
  useEffect(() => {
    if (token) {
      fetch(`${API_BASE}/api/documents/latest`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.id) {
            setContent(data.content || "");
            setDocumentId(data.id);
            setDocumentName(data.name || "Untitled Document");
          }
        })
        .catch((err) => console.error("Error loading document:", err));
    }
  }, [token]);

  const handleLogin = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    setShowAuth(null);
  };

  const handleRegister = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    setShowAuth(null);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setToken(null);
    setContent("");
    setDocumentId(null);
    setShowAuth("login");
  };

  const handleContentChange = (newContent) => {
    setContent(newContent);
  };

  const handleSave = async () => {
    if (!token) return;

    try {
      if (documentId) {
        // Update existing document
        const response = await fetch(
          `${API_BASE}/api/documents/${documentId}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ content, name: documentName }),
          }
        );
        const data = await response.json();
        if (response.ok) {
          setDocumentName(data.name || documentName);
          console.log("Document updated:", data);
        }
      } else {
        // Create new document
        const response = await fetch(`${API_BASE}/api/documents`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ content, name: documentName }),
        });
        const data = await response.json();
        if (response.ok) {
          setDocumentId(data.id);
          setDocumentName(data.name || documentName);
          console.log("Document saved:", data);
        }
      }
    } catch (error) {
      console.error("Error saving document:", error);
    }
  };

  const handleClear = async () => {
    if (!token) return;

    try {
      if (documentId) {
        await fetch(`${API_BASE}/api/documents/${documentId}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }
      setContent("");
      setDocumentId(null);
      setIsReady(true);
    } catch (error) {
      console.error("Error clearing document:", error);
    }
  };

  const handleReset = () => {
    setContent("");
    setIsReady(true);
  };

  const handleSelectDocument = (doc) => {
    setContent(doc.content);
    setDocumentId(doc.id);
    setDocumentName(doc.name || "Untitled Document");
    setIsReady(true);
  };

  const handleNameChange = (newName) => {
    setDocumentName(newName);
  };

  // Show loading state while checking authentication
  if (isAuthenticating) {
    return (
      <div className="app">
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100vh",
            fontFamily: "'Courier New', Courier, monospace",
            color: "#f5f5dc",
          }}
        >
          Loading...
        </div>
      </div>
    );
  }

  // Show login/register if not authenticated
  if (!user || !token) {
    return (
      <div className="app">
        {showAuth === "login" ? (
          <Login
            onLogin={handleLogin}
            onSwitchToRegister={() => setShowAuth("register")}
          />
        ) : (
          <Register
            onRegister={handleRegister}
            onSwitchToLogin={() => setShowAuth("login")}
          />
        )}
      </div>
    );
  }

  return (
    <div className="app">
      <ControlPanel
        onSave={handleSave}
        onClear={handleClear}
        onReset={handleReset}
        onLogout={handleLogout}
        username={user.username}
      />
      <div className="editor-container">
        <div className="document-name-wrapper">
          <DocumentName
            documentName={documentName}
            documentId={documentId}
            onNameChange={handleNameChange}
            token={token}
            content={content}
          />
        </div>
        <TypewriterEditor
          content={content}
          onContentChange={handleContentChange}
          isReady={isReady}
          setIsReady={setIsReady}
        />
      </div>
      <DocumentListButton onClick={() => setShowDocumentList(true)} />
      <DocumentListModal
        isOpen={showDocumentList}
        onClose={() => setShowDocumentList(false)}
        onSelectDocument={handleSelectDocument}
        token={token}
        onDocumentRenamed={(newName) => {
          setDocumentName(newName);
        }}
      />
    </div>
  );
}

export default App;
