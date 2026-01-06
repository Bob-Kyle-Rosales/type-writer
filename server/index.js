const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcryptjs");
const { generateToken, authenticateToken } = require("./auth");

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Database setup
const dbPath = path.join(__dirname, "documents.db");
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Error opening database:", err.message);
  } else {
    console.log("Connected to SQLite database");

    // Create users table
    db.run(
      `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
      (err) => {
        if (err) {
          console.error("Error creating users table:", err.message);
        } else {
          console.log("Users table ready");

          // Check if documents table needs migration
          db.all("PRAGMA table_info(documents)", (err, columns) => {
            if (err) {
              // Table might not exist, create it
              console.log("Documents table does not exist, creating...");
              createDocumentsTable();
            } else if (columns.length === 0) {
              // Table doesn't exist (empty result)
              console.log("Documents table does not exist, creating...");
              createDocumentsTable();
            } else {
              // Check if user_id column exists
              const hasUserId = columns.some((col) => col.name === "user_id");

              if (!hasUserId) {
                console.log(
                  "Migrating documents table to add user_id column..."
                );
                // Drop old table and recreate with user_id
                // Note: This will delete existing documents, but they can't be associated with users anyway
                db.run("DROP TABLE IF EXISTS documents", (err) => {
                  if (err) {
                    console.error(
                      "Error dropping old documents table:",
                      err.message
                    );
                  } else {
                    createDocumentsTable();
                  }
                });
              } else {
                // Check if name column exists
                const hasName = columns.some((col) => col.name === "name");

                if (!hasName) {
                  console.log(
                    "Migrating documents table to add name column..."
                  );
                  db.run(
                    'ALTER TABLE documents ADD COLUMN name TEXT DEFAULT "Untitled Document"',
                    (err) => {
                      if (err) {
                        console.error("Error adding name column:", err.message);
                      } else {
                        console.log(
                          "Documents table migrated with name column"
                        );
                      }
                    }
                  );
                } else {
                  console.log("Documents table ready (already migrated)");
                }
              }
            }
          });
        }
      }
    );
  }
});

// Helper function to create documents table
function createDocumentsTable() {
  db.run(
    `CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT DEFAULT "Untitled Document",
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`,
    (err) => {
      if (err) {
        console.error("Error creating documents table:", err.message);
      } else {
        console.log("Documents table ready");
      }
    }
  );
}

// Helper function to update timestamp
const updateTimestamp = (id) => {
  db.run("UPDATE documents SET updated_at = CURRENT_TIMESTAMP WHERE id = ?", [
    id,
  ]);
};

// API Routes

// Authentication Routes

// Register
app.post("/api/auth/register", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res
      .status(400)
      .json({ error: "Username and password are required" });
  }

  if (username.length < 3) {
    return res
      .status(400)
      .json({ error: "Username must be at least 3 characters" });
  }

  if (password.length < 6) {
    return res
      .status(400)
      .json({ error: "Password must be at least 6 characters" });
  }

  try {
    // Check if username already exists
    db.get(
      "SELECT id FROM users WHERE username = ?",
      [username],
      async (err, row) => {
        if (err) {
          console.error("Error checking username:", err.message);
          return res.status(500).json({ error: "Registration failed" });
        }

        if (row) {
          return res.status(400).json({ error: "Username already exists" });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        db.run(
          "INSERT INTO users (username, password) VALUES (?, ?)",
          [username, hashedPassword],
          function (err) {
            if (err) {
              console.error("Error creating user:", err.message);
              return res.status(500).json({ error: "Registration failed" });
            }

            const token = generateToken(this.lastID);
            res.json({
              token,
              user: { id: this.lastID, username },
              message: "Registration successful",
            });
          }
        );
      }
    );
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Registration failed" });
  }
});

// Login
app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res
      .status(400)
      .json({ error: "Username and password are required" });
  }

  db.get(
    "SELECT id, username, password FROM users WHERE username = ?",
    [username],
    async (err, user) => {
      if (err) {
        console.error("Error finding user:", err.message);
        return res.status(500).json({ error: "Login failed" });
      }

      if (!user) {
        return res.status(401).json({ error: "Invalid username or password" });
      }

      try {
        const isValid = await bcrypt.compare(password, user.password);

        if (!isValid) {
          return res
            .status(401)
            .json({ error: "Invalid username or password" });
        }

        const token = generateToken(user.id);
        res.json({
          token,
          user: { id: user.id, username: user.username },
          message: "Login successful",
        });
      } catch (error) {
        console.error("Password comparison error:", error);
        res.status(500).json({ error: "Login failed" });
      }
    }
  );
});

// Verify token
app.get("/api/auth/verify", authenticateToken, (req, res) => {
  db.get(
    "SELECT id, username FROM users WHERE id = ?",
    [req.userId],
    (err, user) => {
      if (err || !user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({ user: { id: user.id, username: user.username } });
    }
  );
});

// Document Routes (all require authentication)

// Save document
app.post("/api/documents", authenticateToken, (req, res) => {
  const { content, name } = req.body;

  if (content === undefined) {
    return res.status(400).json({ error: "Content is required" });
  }

  const documentName = name || "Untitled Document";

  db.run(
    "INSERT INTO documents (user_id, name, content) VALUES (?, ?, ?)",
    [req.userId, documentName, content],
    function (err) {
      if (err) {
        console.error("Error saving document:", err.message);
        return res.status(500).json({ error: "Failed to save document" });
      }

      res.json({
        id: this.lastID,
        name: documentName,
        content: content,
        message: "Document saved successfully",
      });
    }
  );
});

// Update document
app.put("/api/documents/:id", authenticateToken, (req, res) => {
  const { id } = req.params;
  const { content, name } = req.body;

  if (content === undefined) {
    return res.status(400).json({ error: "Content is required" });
  }

  // Update both content and name if provided
  if (name !== undefined) {
    db.run(
      "UPDATE documents SET content = ?, name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?",
      [content, name, id, req.userId],
      function (err) {
        if (err) {
          console.error("Error updating document:", err.message);
          return res.status(500).json({ error: "Failed to update document" });
        }

        if (this.changes === 0) {
          return res.status(404).json({ error: "Document not found" });
        }

        res.json({
          id: parseInt(id),
          name: name,
          content: content,
          message: "Document updated successfully",
        });
      }
    );
  } else {
    db.run(
      "UPDATE documents SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?",
      [content, id, req.userId],
      function (err) {
        if (err) {
          console.error("Error updating document:", err.message);
          return res.status(500).json({ error: "Failed to update document" });
        }

        if (this.changes === 0) {
          return res.status(404).json({ error: "Document not found" });
        }

        db.get("SELECT name FROM documents WHERE id = ?", [id], (err, row) => {
          res.json({
            id: parseInt(id),
            name: row?.name || "Untitled Document",
            content: content,
            message: "Document updated successfully",
          });
        });
      }
    );
  }
});

// Get all documents for user
app.get("/api/documents", authenticateToken, (req, res) => {
  db.all(
    "SELECT id, name, content, created_at, updated_at FROM documents WHERE user_id = ? ORDER BY updated_at DESC",
    [req.userId],
    (err, rows) => {
      if (err) {
        console.error("Error fetching documents:", err.message);
        return res.status(500).json({ error: "Failed to fetch documents" });
      }

      res.json(rows);
    }
  );
});

// Get document by ID
app.get("/api/documents/:id", authenticateToken, (req, res) => {
  const { id } = req.params;

  db.get(
    "SELECT id, name, content, created_at, updated_at FROM documents WHERE id = ? AND user_id = ?",
    [id, req.userId],
    (err, row) => {
      if (err) {
        console.error("Error fetching document:", err.message);
        return res.status(500).json({ error: "Failed to fetch document" });
      }

      if (!row) {
        return res.status(404).json({ error: "Document not found" });
      }

      res.json(row);
    }
  );
});

// Get latest document
app.get("/api/documents/latest", authenticateToken, (req, res) => {
  db.get(
    "SELECT id, name, content, created_at, updated_at FROM documents WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1",
    [req.userId],
    (err, row) => {
      if (err) {
        console.error("Error fetching latest document:", err.message);
        return res
          .status(500)
          .json({ error: "Failed to fetch latest document" });
      }

      if (!row) {
        return res.json({
          id: null,
          name: "",
          content: "",
          message: "No documents found",
        });
      }

      res.json(row);
    }
  );
});

// Delete document
app.delete("/api/documents/:id", authenticateToken, (req, res) => {
  const { id } = req.params;

  db.run(
    "DELETE FROM documents WHERE id = ? AND user_id = ?",
    [id, req.userId],
    function (err) {
      if (err) {
        console.error("Error deleting document:", err.message);
        return res.status(500).json({ error: "Failed to delete document" });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: "Document not found" });
      }

      res.json({ message: "Document deleted successfully" });
    }
  );
});

// Clear all documents for user
app.delete("/api/documents", authenticateToken, (req, res) => {
  db.run(
    "DELETE FROM documents WHERE user_id = ?",
    [req.userId],
    function (err) {
      if (err) {
        console.error("Error clearing documents:", err.message);
        return res.status(500).json({ error: "Failed to clear documents" });
      }

      res.json({ message: "All documents cleared successfully" });
    }
  );
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Typewriter API is running" });
});

// Serve React build (if available)
const clientBuildPath = path.join(__dirname, "..", "client", "build");
if (fs.existsSync(clientBuildPath)) {
  app.use(express.static(clientBuildPath));

  // Fallback to index.html for client-side routing, but allow API routes to continue
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/")) return next();
    res.sendFile(path.join(clientBuildPath, "index.html"));
  });
}

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on("SIGINT", () => {
  db.close((err) => {
    if (err) {
      console.error("Error closing database:", err.message);
    } else {
      console.log("Database connection closed");
    }
    process.exit(0);
  });
});
