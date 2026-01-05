import React, { useState, useEffect, useRef } from "react";
import "./TypewriterEditor.css";
import bodyImage from "../images/body.png";
import moverModuleImage from "../images/mover_module.png";

const CHARS_PER_LINE = 38; // Fixed width for typewriter paper
const CHAR_WIDTH = 15; // Approximate character width in pixels (monospace)
const LINE_HEIGHT = 24; // Line height in pixels

const TypewriterEditor = ({
  content,
  onContentChange,
  isReady,
  setIsReady,
  maxLines = 16,
}) => {
  const MAX_LINES = maxLines;
  const [lines, setLines] = useState([""]);
  const [currentPosition, setCurrentPosition] = useState({ line: 0, char: 0 });
  const [paperOffset, setPaperOffset] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [dragOffset, setDragOffset] = useState(280);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, offset: 0 });
  const editorRef = useRef(null);
  const inputRef = useRef(null);
  const isInitializedRef = useRef(false);
  const lastContentRef = useRef("");

  // Initialize lines from content only on mount or when content changes externally
  useEffect(() => {
    // Only initialize if content changed externally (not from our own updates)
    if (content !== lastContentRef.current) {
      lastContentRef.current = content;

      if (content) {
        let contentLines = content.split("\n");
        // Enforce max lines from external content
        if (contentLines.length > MAX_LINES) {
          contentLines = contentLines.slice(0, MAX_LINES);
          const trimmed = contentLines.join("\n");
          lastContentRef.current = trimmed;
          // Notify parent that content was trimmed to fit limit
          onContentChange(trimmed);
        }
        setLines(contentLines.length > 0 ? contentLines : [""]);
        // Position cursor at end of content
        const lastLineIndex = contentLines.length - 1;
        const lastLineLength = contentLines[lastLineIndex]?.length || 0;
        setCurrentPosition({ line: lastLineIndex, char: lastLineLength });
      } else {
        setLines([""]);
        setCurrentPosition({ line: 0, char: 0 });
      }
      // Set paper offset: if document empty -> rightmost (0); else shift left by last line chars
      let lastLineLength = 0;
      let totalChars = 0;
      if (content) {
        const contentLines = content.split("\n");
        lastLineLength = getLastLineCharCount(contentLines);
        totalChars = contentLines.reduce(
          (sum, l) => sum + (l ? l.length : 0),
          0
        );
      }

      if (totalChars === 0) {
        setPaperOffset(0);
      } else {
        setPaperOffset(-lastLineLength * (CHAR_WIDTH - 25));
      }
      isInitializedRef.current = true;
    }
  }, [content]);

  const getLastLineCharCount = (someLines) => {
    if (!someLines || someLines.length === 0) return 0;
    const last = someLines[someLines.length - 1] || "";
    return last.length;
  };

  // Focus input when ready
  useEffect(() => {
    if (isReady && inputRef.current) {
      // Use setTimeout to ensure focus happens after render
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 0);
    }
  }, [isReady]);

  // Keep input focused when clicking on paper
  const handlePaperClick = (e) => {
    // Don't focus if we're dragging
    if (!isDragging && inputRef.current && isReady) {
      inputRef.current.focus();
    }
  };

  // Drag handlers
  const handleMouseDown = (e) => {
    if (e.button !== 0) return; // Only left mouse button
    setIsDragging(true);
    setDragStart({
      x: e.clientX,
      offset: dragOffset,
    });
    e.preventDefault();
  };

  // Add global mouse event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      const handleMouseMoveGlobal = (e) => {
        if (!isDragging) return;
        const deltaX = e.clientX - dragStart.x;
        const newOffset = dragStart.offset + deltaX;
        const maxDrag = 280; /// was 200f
        const clampedOffset = Math.max(-maxDrag, Math.min(maxDrag, newOffset));
        setDragOffset(clampedOffset);
      };

      const handleMouseUpGlobal = () => {
        setIsDragging(false);
        if (inputRef.current && isReady) {
          inputRef.current.focus();
        }
      };

      window.addEventListener("mousemove", handleMouseMoveGlobal);
      window.addEventListener("mouseup", handleMouseUpGlobal);
      return () => {
        window.removeEventListener("mousemove", handleMouseMoveGlobal);
        window.removeEventListener("mouseup", handleMouseUpGlobal);
      };
    }
  }, [isDragging, dragStart, isReady]);

  const handleKeyDown = (e) => {
    if (!isReady) {
      e.preventDefault();
      return;
    }

    // Prevent default behavior for arrow keys and other navigation
    if (
      [
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
        "Home",
        "End",
      ].includes(e.key)
    ) {
      e.preventDefault();
      return;
    }

    // Handle backspace
    if (e.key === "Backspace") {
      e.preventDefault();
      handleBackspace();
      return;
    }

    // Handle Enter
    if (e.key === "Enter") {
      e.preventDefault();
      handleEnter();
      return;
    }

    // Handle regular characters (printable)
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      handleCharacter(e.key);
    }
  };

  const handleCharacter = (char) => {
    const { line, char: charPos } = currentPosition;
    const newLines = [...lines];

    // Check if we're at the right edge
    if (charPos >= CHARS_PER_LINE) {
      // If we're already at the last allowed line, block creating another
      if (newLines.length >= MAX_LINES) {
        return; // ignore input
      }
      // Insert character at edge (it will overflow visually)
      newLines[line] = newLines[line] || "";
      newLines[line] += char;

      // Create new line
      newLines.splice(line + 1, 0, "");

      // Update position
      setCurrentPosition({ line: line + 1, char: 0 });

      // Animate: shift left to show character, then snap back
      const targetOffset = -getLastLineCharCount(newLines) * CHAR_WIDTH;
      animateLineBreak(targetOffset);
    } else {
      // Normal character entry
      newLines[line] = newLines[line] || "";
      const before = newLines[line].slice(0, charPos);
      const after = newLines[line].slice(charPos);
      newLines[line] = before + char + after;

      // Set paper offset based on last line character count
      setPaperOffset(-getLastLineCharCount(newLines) * CHAR_WIDTH);

      // Update position
      setCurrentPosition({ line, char: charPos + 1 });
    }

    setLines(newLines);
    updateContent(newLines);
  };

  const handleBackspace = () => {
    const { line, char: charPos } = currentPosition;

    if (charPos === 0 && line === 0) {
      // Can't go back further
      return;
    }

    const newLines = [...lines];

    if (charPos === 0) {
      // Move to end of previous line
      const prevLineLength = newLines[line - 1].length;
      newLines[line - 1] += newLines[line];
      newLines.splice(line, 1);
      setCurrentPosition({ line: line - 1, char: prevLineLength });
      // Update paper offset after merging lines
      setPaperOffset(-getLastLineCharCount(newLines) * CHAR_WIDTH);
    } else {
      // Remove character from current position
      newLines[line] =
        newLines[line].slice(0, charPos - 1) + newLines[line].slice(charPos);
      // Update paper offset after deleting
      setPaperOffset(-getLastLineCharCount(newLines) * CHAR_WIDTH);
      setCurrentPosition({ line, char: charPos - 1 });
    }

    setLines(newLines);
    updateContent(newLines);
  };

  const handleEnter = () => {
    const { line } = currentPosition;
    const newLines = [...lines];

    // Split current line at cursor position
    const currentLine = newLines[line] || "";
    const before = currentLine.slice(0, currentPosition.char);
    const after = currentLine.slice(currentPosition.char);

    // Prevent creating a new line beyond the maximum allowed
    if (newLines.length >= MAX_LINES) {
      // If at limit, keep current line unchanged and move cursor to end
      setCurrentPosition({ line, char: before.length });
      return;
    }

    newLines[line] = before;
    newLines.splice(line + 1, 0, after);

    // Animate line break
    const targetOffset = -getLastLineCharCount(newLines) * CHAR_WIDTH;
    animateLineBreak(targetOffset);

    setCurrentPosition({ line: line + 1, char: 0 });
    setLines(newLines);
    updateContent(newLines);
  };

  const animateLineBreak = (targetOffset) => {
    setIsAnimating(true);

    // Small extra shift to emphasize the break, then move to target offset
    setPaperOffset((prev) => prev - CHAR_WIDTH);

    setTimeout(() => {
      setPaperOffset(typeof targetOffset === "number" ? targetOffset : 0);
      setIsAnimating(false);
    }, 280); /// was 200f
  };

  const updateContent = (newLines) => {
    const newContent = newLines.join("\n");
    lastContentRef.current = newContent;
    onContentChange(newContent);
  };

  // Calculate total height needed
  const totalHeight = Math.max(
    lines.length * LINE_HEIGHT,
    window.innerHeight - 100
  );

  return (
    <div
      className="typewriter-editor"
      ref={editorRef}
      onClick={handlePaperClick}
    >
      <div className="paper-container" onClick={handlePaperClick}>
        <div>
          <img
            src={bodyImage}
            alt="Body Module"
            className="body-module-image"
          />
        </div>
        <div
          className={`paper ${isAnimating ? "animating" : ""} ${
            isDragging ? "dragging" : ""
          }`}
          style={{
            transform: `translateX(${paperOffset + dragOffset}px)`,
            transition: isAnimating
              ? "transform 0.15s ease-out"
              : isDragging
              ? "none"
              : "transform 0.1s linear",
            cursor: isDragging ? "grabbing" : "grab",
            padding: "1in 1.3in",
          }}
          onClick={handlePaperClick}
          onMouseDown={handleMouseDown}
        >
          <div
            className="paper-content"
            style={{ minHeight: `${totalHeight}px` }}
          >
            {lines.map((line, lineIndex) => (
              <div
                key={lineIndex}
                className="paper-line"
                style={{
                  width: `${CHARS_PER_LINE * CHAR_WIDTH}px`,
                  height: `${LINE_HEIGHT}px`,
                }}
              >
                <span className="line-text">{line}</span>
                {lineIndex === currentPosition.line && (
                  <span
                    className="cursor"
                    style={{
                      left: `${currentPosition.char * CHAR_WIDTH}px`,
                    }}
                  >
                    |
                  </span>
                )}
              </div>
            ))}
          </div>
          <div className="paper-mover-module">
            <img
              src={moverModuleImage}
              alt="Mover Module"
              className="mover-module-image"
            />
          </div>
        </div>
      </div>
      <input
        ref={inputRef}
        type="text"
        className="hidden-input"
        onKeyDown={handleKeyDown}
        onBlur={(e) => {
          // Don't refocus if user is editing document name or other inputs
          const isEditingName =
            document.body.getAttribute("data-editing-name") === "true";
          const activeElement = document.activeElement;
          const isInputFocused =
            activeElement &&
            (activeElement.tagName === "INPUT" ||
              activeElement.tagName === "TEXTAREA");

          // Refocus immediately if we're ready and not editing other inputs
          if (isReady && !isEditingName && !isInputFocused) {
            setTimeout(() => {
              if (
                inputRef.current &&
                document.activeElement !== inputRef.current
              ) {
                const stillEditing =
                  document.body.getAttribute("data-editing-name") === "true";
                if (!stillEditing) {
                  inputRef.current.focus();
                }
              }
            }, 100);
          }
        }}
        autoFocus
        tabIndex={0}
        autoComplete="off"
        spellCheck="false"
      />
    </div>
  );
};

export default TypewriterEditor;
