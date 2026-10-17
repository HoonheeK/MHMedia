import React from "react";
import { X, ExternalLink, BookOpen } from "lucide-react";
import { openUrl } from "@tauri-apps/plugin-opener";

interface OpenLicenseDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

interface LicenseItem {
  name: string;
  description: string;
  url: string;
  license: string;
}

const openSourceLicenses: LicenseItem[] = [
  {
    name: "React",
    description: "A JavaScript library for building modern user interfaces",
    url: "https://react.dev/",
    license: "MIT",
  },
  {
    name: "Tauri",
    description: "Build smaller, faster, and more secure desktop applications with web technologies",
    url: "https://tauri.app/",
    license: "MIT / Apache-2.0",
  },
  {
    name: "Lucide Icons",
    description: "Beautiful & consistent open-source icon toolkit",
    url: "https://lucide.dev/",
    license: "ISC",
  },
  {
    name: "TypeScript",
    description: "Typed JavaScript at any scale with static type checking",
    url: "https://www.typescriptlang.org/",
    license: "Apache-2.0",
  },
  {
    name: "Vite",
    description: "Next Generation Frontend Tooling for ultrafast builds",
    url: "https://vitejs.dev/",
    license: "MIT",
  },
  {
    name: "LRCLIB",
    description: "Community-driven synchronized and plain lyrics provider",
    url: "https://lrclib.net/",
    license: "Open API",
  },
  {
    name: "Groq Cloud & OpenAI",
    description: "High-speed AI speech-to-text inference API integrations",
    url: "https://groq.com/",
    license: "Cloud Services API",
  },
];

export const OpenLicenseDialog: React.FC<OpenLicenseDialogProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const handleOpenLink = async (url: string) => {
    try {
      await openUrl(url);
    } catch {
      window.open(url, "_blank");
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 130 }}>
      <div
        className="modal-card"
        style={{
          maxWidth: 640,
          width: "90%",
          maxHeight: "82vh",
          display: "flex",
          flexDirection: "column",
          padding: 0,
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header" style={{ padding: "18px 24px", margin: 0, borderBottom: "1px solid var(--border-color)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "var(--radius-sm)",
                background: "rgba(99, 102, 241, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#818cf8",
              }}
            >
              <BookOpen size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 600, color: "#fff" }}>
                Open Source Licenses
              </h3>
              <p style={{ margin: 0, fontSize: "0.76rem", color: "var(--text-muted)" }}>
                Third-party open source libraries & acknowledgements
              </p>
            </div>
          </div>
          <button className="btn-icon-only" onClick={onClose} title="Close">
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
          <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.6, marginTop: 0, marginBottom: 18 }}>
            MHMedia is built on top of fantastic open-source software and services. We are deeply grateful to the community for their contributions.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {openSourceLicenses.map((lib) => (
              <div
                key={lib.name}
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "var(--radius-md)",
                  padding: "14px 16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 16,
                  transition: "background 0.2s ease, border-color 0.2s ease",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, fontSize: "0.92rem", color: "#fff" }}>
                      {lib.name}
                    </span>
                    <span
                      style={{
                        fontSize: "0.68rem",
                        padding: "2px 6px",
                        borderRadius: "var(--radius-sm)",
                        background: "rgba(99, 102, 241, 0.15)",
                        color: "#c7d2fe",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {lib.license}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                    {lib.description}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenLink(lib.url)}
                  className="btn btn-secondary"
                  style={{
                    padding: "6px 12px",
                    fontSize: "0.76rem",
                    whiteSpace: "nowrap",
                    gap: 5,
                  }}
                  title={`Visit ${lib.name} website`}
                >
                  Visit <ExternalLink size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "14px 24px",
            borderTop: "1px solid var(--border-color)",
            display: "flex",
            justifyContent: "flex-end",
            background: "rgba(0, 0, 0, 0.2)",
          }}
        >
          <button className="btn btn-secondary" onClick={onClose} style={{ minWidth: 80, justifyContent: "center" }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default OpenLicenseDialog;
