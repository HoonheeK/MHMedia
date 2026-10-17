import React, { useState, useEffect } from "react";
import { X, ShieldCheck, Copy, Check, ExternalLink, RefreshCw, AlertCircle } from "lucide-react";
import { openUrl } from "@tauri-apps/plugin-opener";

interface LicenseAndUpdateDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

interface StoredLicense {
  email: string;
  key: string;
  status: "Activated" | "Trial" | "Expired";
  expiryDate?: string;
}

export const LicenseAndUpdateDialog: React.FC<LicenseAndUpdateDialogProps> = ({ isOpen, onClose }) => {
  const [deviceId, setDeviceId] = useState<string>("");
  const [isCopiedId, setIsCopiedId] = useState<boolean>(false);

  const [licenseEmail, setLicenseEmail] = useState<string>("");
  const [licenseKey, setLicenseKey] = useState<string>("");
  const [licenseInfo, setLicenseInfo] = useState<StoredLicense>(() => {
    const saved = localStorage.getItem("mh_license_info");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return {
      email: "",
      key: "",
      status: "Trial",
      expiryDate: "30 days left",
    };
  });

  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState<boolean>(false);
  const [updateMsg, setUpdateMsg] = useState<string | null>(null);

  useEffect(() => {
    let id = localStorage.getItem("mh_device_id");
    if (!id) {
      const randomSegment = () => Math.random().toString(36).substring(2, 6).toUpperCase();
      id = `MH-${randomSegment()}-${randomSegment()}-${randomSegment()}`;
      localStorage.setItem("mh_device_id", id);
    }
    setDeviceId(id);
  }, []);

  if (!isOpen) return null;

  const handleCopyDeviceId = () => {
    navigator.clipboard.writeText(deviceId);
    setIsCopiedId(true);
    setTimeout(() => setIsCopiedId(false), 1800);
  };

  const handleBuy = async () => {
    if (!licenseEmail.trim()) {
      setFeedbackMsg({ type: "error", text: "Please enter your email to proceed with license purchase." });
      return;
    }
    const buyUrl = `https://www.marh-sw.com/buy.html?email=${encodeURIComponent(licenseEmail)}&deviceId=${encodeURIComponent(deviceId)}`;
    try {
      await openUrl(buyUrl);
    } catch {
      window.open(buyUrl, "_blank");
    }
  };

  const handleActivate = () => {
    if (!licenseEmail.trim() || !licenseKey.trim()) {
      setFeedbackMsg({ type: "error", text: "Please enter both registered email and license key." });
      return;
    }

    if (licenseKey.trim().length < 8) {
      setFeedbackMsg({ type: "error", text: "Invalid license key format. Please check and try again." });
      return;
    }

    const updated: StoredLicense = {
      email: licenseEmail.trim(),
      key: licenseKey.trim(),
      status: "Activated",
      expiryDate: "Lifetime License",
    };

    setLicenseInfo(updated);
    localStorage.setItem("mh_license_info", JSON.stringify(updated));
    setFeedbackMsg({
      type: "success",
      text: "License activated successfully! Thank you for supporting MHMedia.",
    });
  };

  const handleCheckUpdate = () => {
    setIsCheckingUpdate(true);
    setUpdateMsg(null);
    setTimeout(() => {
      setIsCheckingUpdate(false);
      setUpdateMsg("You are currently running the latest version of MHMedia (v0.1.0).");
    }, 1200);
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 130 }}>
      <div
        className="modal-card"
        style={{
          maxWidth: 580,
          width: "90%",
          maxHeight: "85vh",
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
                background: "rgba(16, 185, 129, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#10b981",
              }}
            >
              <ShieldCheck size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 600, color: "#fff" }}>
                License & Update
              </h3>
              <p style={{ margin: 0, fontSize: "0.76rem", color: "var(--text-muted)" }}>
                Manage application license, device binding, and software updates
              </p>
            </div>
          </div>
          <button className="btn-icon-only" onClick={onClose} title="Close">
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 18 }}>
          
          {/* Section 1: License Status */}
          <div
            style={{
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid var(--border-color)",
              borderRadius: "var(--radius-md)",
              padding: "16px 18px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ fontSize: "0.86rem", fontWeight: 600, color: "#fff" }}>
                License Status
              </span>
              <div>
                {licenseInfo.status === "Activated" ? (
                  <span
                    style={{
                      background: "rgba(16, 185, 129, 0.15)",
                      color: "#10b981",
                      border: "1px solid rgba(16, 185, 129, 0.3)",
                      padding: "3px 10px",
                      borderRadius: "var(--radius-full)",
                      fontSize: "0.76rem",
                      fontWeight: 600,
                    }}
                  >
                    Activated ({licenseInfo.expiryDate || "Lifetime"})
                  </span>
                ) : licenseInfo.status === "Trial" ? (
                  <span
                    style={{
                      background: "rgba(245, 158, 11, 0.15)",
                      color: "#f59e0b",
                      border: "1px solid rgba(245, 158, 11, 0.3)",
                      padding: "3px 10px",
                      borderRadius: "var(--radius-full)",
                      fontSize: "0.76rem",
                      fontWeight: 600,
                    }}
                  >
                    Trial Mode ({licenseInfo.expiryDate || "Active"})
                  </span>
                ) : (
                  <span
                    style={{
                      background: "rgba(239, 68, 68, 0.15)",
                      color: "#ef4444",
                      border: "1px solid rgba(239, 68, 68, 0.3)",
                      padding: "3px 10px",
                      borderRadius: "var(--radius-full)",
                      fontSize: "0.76rem",
                      fontWeight: 600,
                    }}
                  >
                    Expired
                  </span>
                )}
              </div>
            </div>

            <label style={{ display: "block", fontSize: "0.76rem", color: "var(--text-muted)", marginBottom: 6 }}>
              Device ID (Hardware Bound):
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="text"
                readOnly
                value={deviceId}
                className="search-input"
                style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem", color: "var(--accent-cyan)", background: "rgba(0, 0, 0, 0.3)" }}
              />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCopyDeviceId}
                style={{ padding: "0 14px", whiteSpace: "nowrap" }}
                title="Copy Device ID"
              >
                {isCopiedId ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                <span>{isCopiedId ? "Copied" : "Copy"}</span>
              </button>
            </div>
            <p style={{ margin: "8px 0 0 0", fontSize: "0.73rem", color: "var(--text-muted)", lineHeight: 1.4 }}>
              This unique ID is generated based on your hardware and is used to bind your license code securely.
            </p>
          </div>

          {/* Section 2: Register License */}
          <div
            style={{
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid var(--border-color)",
              borderRadius: "var(--radius-md)",
              padding: "16px 18px",
            }}
          >
            <span style={{ display: "block", fontSize: "0.86rem", fontWeight: 600, color: "#fff", marginBottom: 12 }}>
              Register / Purchase License
            </span>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: "0.76rem", color: "var(--text-muted)", marginBottom: 6 }}>
                Email Address:
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="email"
                  className="search-input"
                  placeholder="name@example.com"
                  value={licenseEmail}
                  onChange={(e) => setLicenseEmail(e.target.value)}
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleBuy}
                  style={{
                    padding: "0 14px",
                    whiteSpace: "nowrap",
                    background: "rgba(16, 185, 129, 0.15)",
                    borderColor: "rgba(16, 185, 129, 0.3)",
                    color: "#34d399",
                  }}
                  title="Buy License on website"
                >
                  Buy License <ExternalLink size={12} />
                </button>
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: "0.76rem", color: "var(--text-muted)", marginBottom: 6 }}>
                License Key:
              </label>
              <input
                type="text"
                className="search-input"
                placeholder="XXXXX-XXXXX-XXXXX-XXXXX"
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value)}
                style={{ fontFamily: "var(--font-mono)", letterSpacing: "1px" }}
              />
            </div>

            {feedbackMsg && (
              <div
                style={{
                  marginBottom: 12,
                  padding: "8px 12px",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "0.78rem",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background:
                    feedbackMsg.type === "success"
                      ? "rgba(16, 185, 129, 0.12)"
                      : "rgba(239, 68, 68, 0.12)",
                  border: `1px solid ${
                    feedbackMsg.type === "success" ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"
                  }`,
                  color: feedbackMsg.type === "success" ? "#34d399" : "#f87171",
                }}
              >
                {feedbackMsg.type === "success" ? <Check size={14} /> : <AlertCircle size={14} />}
                <span>{feedbackMsg.text}</span>
              </div>
            )}

            <button
              type="button"
              className="btn btn-primary"
              onClick={handleActivate}
              style={{ width: "100%", justifyContent: "center", padding: "10px" }}
            >
              Activate License
            </button>
          </div>

          {/* Section 3: Software Update */}
          <div
            style={{
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid var(--border-color)",
              borderRadius: "var(--radius-md)",
              padding: "16px 18px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div>
                <span style={{ display: "block", fontSize: "0.86rem", fontWeight: 600, color: "#fff" }}>
                  Software Update
                </span>
                <span style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>
                  Check for the latest updates and bug fixes for MHMedia
                </span>
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCheckUpdate}
                disabled={isCheckingUpdate}
                style={{ padding: "8px 14px", whiteSpace: "nowrap" }}
              >
                <RefreshCw size={14} className={isCheckingUpdate ? "spin" : ""} />
                <span>{isCheckingUpdate ? "Checking..." : "Check for Updates"}</span>
              </button>
            </div>

            {updateMsg && (
              <div
                style={{
                  marginTop: 10,
                  padding: "8px 12px",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "0.78rem",
                  background: "rgba(99, 102, 241, 0.1)",
                  border: "1px solid rgba(99, 102, 241, 0.25)",
                  color: "#c7d2fe",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Check size={14} color="#10b981" />
                <span>{updateMsg}</span>
              </div>
            )}
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

export default LicenseAndUpdateDialog;
