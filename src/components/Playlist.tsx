import React, { useState } from "react";
import { MediaItem } from "../types/media";
import {
  ListMusic,
  Search,
  Music,
  Film,
  Trash2,
  FolderOpen,
  X,
  FilePlus,
} from "lucide-react";

interface PlaylistProps {
  items: MediaItem[];
  currentIndex: number;
  isOpen: boolean;
  onSelectTrack: (index: number) => void;
  onRemoveTrack: (id: string, e: React.MouseEvent) => void;
  onClearPlaylist: () => void;
  onOpenFile: () => void;
  onOpenFolder: () => void;
  onClose: () => void;
}

export const Playlist: React.FC<PlaylistProps> = ({
  items,
  currentIndex,
  isOpen,
  onSelectTrack,
  onRemoveTrack,
  onClearPlaylist,
  onOpenFile,
  onOpenFolder,
  onClose,
}) => {
  const [filterText, setFilterText] = useState("");

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(filterText.toLowerCase())
  );

  return (
    <aside className={`playlist-panel ${isOpen ? "" : "collapsed"}`}>
      <div className="playlist-header">
        <div className="playlist-title">
          <ListMusic size={18} color="#818cf8" />
          <span>Playlist</span>
          <span className="playlist-count">{items.length}</span>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {items.length > 0 && (
            <button
              className="btn-icon-only"
              title="Clear playlist"
              onClick={onClearPlaylist}
            >
              <Trash2 size={16} />
            </button>
          )}
          <button className="btn-icon-only" title="Close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="playlist-search-box">
        <Search size={14} className="search-icon-pos" />
        <input
          type="text"
          className="search-input"
          placeholder="Search tracks..."
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
        />
      </div>

      <div
        style={{
          display: "flex",
          gap: 6,
          padding: "8px 16px",
          borderBottom: "1px solid var(--border-color)",
        }}
      >
        <button
          className="btn btn-secondary"
          style={{ flex: 1, padding: "6px 10px", fontSize: "0.78rem" }}
          onClick={onOpenFile}
        >
          <FilePlus size={14} /> Add Files
        </button>
        <button
          className="btn btn-secondary"
          style={{ flex: 1, padding: "6px 10px", fontSize: "0.78rem" }}
          onClick={onOpenFolder}
        >
          <FolderOpen size={14} /> Scan Folder
        </button>
      </div>

      <div className="playlist-items">
        {items.length === 0 ? (
          <div
            style={{
              padding: "40px 20px",
              textAlign: "center",
              color: "var(--text-muted)",
              fontSize: "0.85rem",
            }}
          >
            Playlist is empty.
            <div style={{ marginTop: 10 }}>
              Add media files or folders to start!
            </div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div
            style={{
              padding: "30px 20px",
              textAlign: "center",
              color: "var(--text-muted)",
              fontSize: "0.82rem",
            }}
          >
            No matching media found.
          </div>
        ) : (
          filteredItems.map((item) => {
            const originalIndex = items.findIndex((i) => i.id === item.id);
            const isActive = originalIndex === currentIndex;

            return (
              <div
                key={item.id}
                className={`playlist-item ${isActive ? "active" : ""}`}
                onClick={() => onSelectTrack(originalIndex)}
              >
                <div className="track-icon">
                  {item.mediaType === "video" ? (
                    <Film size={15} />
                  ) : (
                    <Music size={15} />
                  )}
                </div>
                <div className="track-info">
                  <span className="track-name" title={item.name}>
                    {item.name}
                  </span>
                  <div className="track-sub">
                    <span className="tag-badge">{item.extension}</span>
                    <span>{formatSize(item.sizeBytes)}</span>
                  </div>
                </div>
                <button
                  className="track-remove-btn"
                  title="Remove"
                  onClick={(e) => onRemoveTrack(item.id, e)}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
