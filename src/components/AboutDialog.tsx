import React, { useEffect, useState } from "react";
import { X, ExternalLink } from "lucide-react";
import appIcon from "../assets/app-icon.png";
import { getVersion } from "@tauri-apps/api/app";
import { openUrl } from "@tauri-apps/plugin-opener";

interface AboutDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutDialog: React.FC<AboutDialogProps> = ({ isOpen, onClose }) => {
  const [version, setVersion] = useState<string>("0.1.0");

  useEffect(() => {
    getVersion().then(setVersion).catch(() => setVersion("0.1.0"));
  }, []);

  if (!isOpen) return null;

  const handleOpenLink = async () => {
    try {
      await openUrl("https://www.marh-sw.com");
    } catch {
      window.open("https://www.marh-sw.com", "_blank");
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 130 }}>
      <div
        className="modal-card"
        style={{ maxWidth: 440, textAlign: "center", padding: "28px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: -10 }}>
          <button className="btn-icon-only" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "16px",
              background: "linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(6, 182, 212, 0.2))",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
              boxShadow: "0 10px 25px rgba(99, 102, 241, 0.25)",
            }}
          >
            <img
              src={appIcon}
              alt="MHMedia Icon"
              style={{ width: 52, height: 52, objectFit: "contain" }}
            />
          </div>

          <h3 style={{ margin: "0 0 4px 0", fontSize: "1.35rem", fontWeight: 700, color: "#fff" }}>
            MHMedia
          </h3>
          <p style={{ margin: "0 0 14px 0", fontSize: "0.82rem", color: "var(--accent-cyan)", fontFamily: "var(--font-mono)" }}>
            Version {version}
          </p>

          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.6, margin: "0 0 18px 0" }}>
            A modern, high-performance media player and smart AI transcription assistant for seamless audio & video playback.
          </p>

          <div style={{ marginBottom: 20 }}>
            <button
              type="button"
              onClick={handleOpenLink}
              style={{
                background: "rgba(99, 102, 241, 0.12)",
                border: "1px solid rgba(99, 102, 241, 0.3)",
                borderRadius: "var(--radius-full)",
                padding: "6px 14px",
                color: "#a5b4fc",
                fontSize: "0.82rem",
                fontWeight: 500,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                transition: "all 0.2s ease",
              }}
              title="Visit Official Website"
            >
              www.marh-sw.com <ExternalLink size={13} />
            </button>
          </div>

          <p style={{ margin: 0, fontSize: "0.74rem", color: "var(--text-muted)" }}>
            &copy; {new Date().getFullYear()} Marh Software. All rights reserved.
          </p>

          <div style={{ width: "100%", marginTop: 24, display: "flex", justifyContent: "center" }}>
            <button
              className="btn btn-primary"
              style={{ minWidth: 100, justifyContent: "center" }}
              onClick={onClose}
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutDialog;
