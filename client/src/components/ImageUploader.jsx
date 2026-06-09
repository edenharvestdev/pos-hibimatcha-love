import React, { useState, useRef, useCallback } from "react";
import { IconX } from "@/icons";

/**
 * ImageUploader — reusable image upload component
 * Props:
 *   value: string (current image URL)
 *   onChange: (url: string) => void
 *   label?: string
 */
export const ImageUploader = ({ value, onChange, label = "Image" }) => {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");
  const [urlMode, setUrlMode] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const fileRef = useRef(null);

  const getToken = () => {
    try {
      const stored = localStorage.getItem("hibi-staff-token");
      if (!stored) return "";
      const parsed = JSON.parse(stored);
      return parsed?.token || "";
    } catch {
      return "";
    }
  };

  const uploadFile = useCallback(async (file) => {
    setError("");
    // Validate client-side
    const allowed = ["image/png", "image/jpeg", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) {
      setError("Only PNG, JPG, WebP, GIF allowed");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("File too large (max 5MB)");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const token = getToken();
      const resp = await fetch("/api/upload", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data.error || `Upload failed (${resp.status})`);
      }

      const { url } = await resp.json();
      onChange(url);
    } catch (err) {
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  }, [onChange]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    // Reset input so same file can be re-selected
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleUrlSubmit = () => {
    const trimmed = urlInput.trim();
    if (trimmed) {
      onChange(trimmed);
      setUrlInput("");
      setUrlMode(false);
    }
  };

  const handleRemove = () => {
    onChange("");
  };

  return (
    <div className="image-uploader">
      {label && (
        <label className="image-uploader__label">{label}</label>
      )}

      {/* Preview or Drop Zone */}
      {value ? (
        <div className="image-uploader__preview">
          <img src={value} alt="Preview" className="image-uploader__img" />
          <button
            type="button"
            className="image-uploader__remove"
            onClick={handleRemove}
            title="Remove image"
          >
            <IconX size={14} />
          </button>
        </div>
      ) : (
        <div
          className={`image-uploader__dropzone ${dragOver ? "image-uploader__dropzone--active" : ""} ${uploading ? "image-uploader__dropzone--uploading" : ""}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => !uploading && fileRef.current?.click()}
        >
          {uploading ? (
            <div className="image-uploader__spinner">
              <div className="image-uploader__spinner-ring" />
              <span>Uploading...</span>
            </div>
          ) : (
            <>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--matcha-600)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
              <span className="image-uploader__droptext">
                Drag image here or <strong>Choose file</strong>
              </span>
              <span className="image-uploader__hint">PNG / JPG / WebP up to 5MB</span>
            </>
          )}
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />

      {/* URL paste option */}
      <div className="image-uploader__url-section">
        {!urlMode ? (
          <button
            type="button"
            className="image-uploader__url-toggle"
            onClick={() => setUrlMode(true)}
          >
            — or paste URL —
          </button>
        ) : (
          <div className="image-uploader__url-row">
            <input
              type="text"
              className="image-uploader__url-input"
              placeholder="https://..."
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleUrlSubmit()}
            />
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleUrlSubmit}
              disabled={!urlInput.trim()}
            >
              Set
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => { setUrlMode(false); setUrlInput(""); }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="image-uploader__error">{error}</div>
      )}

      <style>{`
        .image-uploader {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .image-uploader__label {
          font-size: 13px;
          font-weight: 500;
          color: var(--text-secondary);
        }
        .image-uploader__preview {
          position: relative;
          border-radius: 10px;
          overflow: hidden;
          border: 1px solid var(--border-default);
          background: var(--bg-secondary);
        }
        .image-uploader__img {
          width: 100%;
          height: 200px;
          object-fit: cover;
          display: block;
        }
        .image-uploader__remove {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: rgba(0,0,0,0.6);
          color: white;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.15s;
        }
        .image-uploader__remove:hover {
          background: rgba(200,0,0,0.8);
        }
        .image-uploader__dropzone {
          border: 2px dashed var(--border-default);
          border-radius: 10px;
          padding: 32px 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          transition: border-color 0.2s, background 0.2s;
          background: var(--bg-secondary);
          min-height: 140px;
          justify-content: center;
        }
        .image-uploader__dropzone:hover {
          border-color: var(--matcha-500);
          background: var(--matcha-50, rgba(34,197,94,0.04));
        }
        .image-uploader__dropzone--active {
          border-color: var(--matcha-600);
          background: var(--matcha-50, rgba(34,197,94,0.08));
        }
        .image-uploader__dropzone--uploading {
          cursor: wait;
          opacity: 0.7;
        }
        .image-uploader__droptext {
          font-size: 13px;
          color: var(--text-secondary);
        }
        .image-uploader__droptext strong {
          color: var(--matcha-600);
        }
        .image-uploader__hint {
          font-size: 11px;
          color: var(--text-tertiary);
        }
        .image-uploader__spinner {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          color: var(--text-secondary);
          font-size: 13px;
        }
        .image-uploader__spinner-ring {
          width: 24px;
          height: 24px;
          border: 2.5px solid var(--border-default);
          border-top-color: var(--matcha-600);
          border-radius: 50%;
          animation: img-spin 0.7s linear infinite;
        }
        @keyframes img-spin {
          to { transform: rotate(360deg); }
        }
        .image-uploader__url-section {
          text-align: center;
        }
        .image-uploader__url-toggle {
          background: none;
          border: none;
          font-size: 12px;
          color: var(--text-tertiary);
          cursor: pointer;
          padding: 4px 8px;
        }
        .image-uploader__url-toggle:hover {
          color: var(--matcha-600);
        }
        .image-uploader__url-row {
          display: flex;
          gap: 6px;
          align-items: center;
        }
        .image-uploader__url-input {
          flex: 1;
          padding: 6px 10px;
          border: 1px solid var(--border-default);
          border-radius: 6px;
          font-size: 13px;
          background: var(--bg-primary);
          color: var(--text-primary);
        }
        .image-uploader__url-input:focus {
          outline: none;
          border-color: var(--matcha-500);
        }
        .image-uploader__error {
          font-size: 12px;
          color: var(--error, #ef4444);
          padding: 4px 0;
        }
      `}</style>
    </div>
  );
};

export default ImageUploader;
