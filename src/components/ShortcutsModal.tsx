import React from "react";
import { X, Keyboard } from "lucide-react";

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: "Space", desc: "Play / Pause" },
    { key: "← / →", desc: "Seek 5s Backward / Forward" },
    { key: "↑ / ↓", desc: "Volume Up / Down (5%)" },
    { key: "M", desc: "Toggle Mute" },
    { key: "F", desc: "Toggle Fullscreen" },
    { key: "L", desc: "Toggle Playlist Sidebar" },
    { key: "N", desc: "Next Track" },
    { key: "P", desc: "Previous Track" },
    { key: "R", desc: "Repeat Mode (All / One / Off)" },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Keyboard size={20} color="#6366f1" />
            <span className="modal-title">Keyboard Shortcuts</span>
          </div>
          <button className="btn-icon-only" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </div>

        <div className="shortcut-grid">
          {shortcuts.map((sc, i) => (
            <div key={i} className="shortcut-item">
              <span className="shortcut-name">{sc.desc}</span>
              <kbd className="kbd">{sc.key}</kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
