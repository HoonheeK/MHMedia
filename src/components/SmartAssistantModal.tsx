import React, { useState, useEffect, useRef } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import { MediaItem } from "../types/media";
import {
  Mic,
  Music,
  Film,
  X,
  Copy,
  Check,
  ChevronDown,
  FileText,
  Clock,
  Search,
  Languages,
  Edit3,
  Trash2,
  AlertCircle,
  Zap,
  Key,
  ExternalLink,
  Loader2,
  Maximize2,
  Minimize2,
} from "lucide-react";
import appIcon from "../assets/app-icon.png";

export type AssistantTab = "recording" | "lyrics" | "video_stt";
export type SupportedLang = "ko-KR" | "en-US" | "ja-JP";
export type CopyMode = "text_only" | "with_time";

interface SubtitleItem {
  start: number;
  end: number;
  text: string;
}

interface SmartAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTrack: MediaItem | null;
  currentTime: number;
  duration?: number;
  isPlaying?: boolean;
  onTogglePlay?: () => void;
  onSeek: (time: number) => void;
  defaultTab?: AssistantTab;
}

export const SmartAssistantModal: React.FC<SmartAssistantModalProps> = ({
  isOpen,
  onClose,
  currentTrack,
  currentTime,
  duration = 0,
  isPlaying = false,
  onTogglePlay,
  onSeek,
  defaultTab,
}) => {
  const [activeTab, setActiveTab] = useState<AssistantTab>("recording");

  // Selected Language: 한국어(ko-KR), 영어(en-US), 일본어(ja-JP)
  const [selectedLang, setSelectedLang] = useState<SupportedLang>("ko-KR");

  // --- Drag & Maximize State ---
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDraggingModal, setIsDraggingModal] = useState<boolean>(false);
  const [isMaximized, setIsMaximized] = useState<boolean>(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; startX: number; startY: number }>({
    mouseX: 0,
    mouseY: 0,
    startX: 0,
    startY: 0,
  });

  // --- Window Size State (Horizontal & Vertical Resizing) ---
  const [size, setSize] = useState<{ width: number; height: number }>({
    width: 820,
    height: 640,
  });
  const [isResizing, setIsResizing] = useState<"right" | "bottom" | "corner" | null>(null);
  const resizeStartRef = useRef<{
    mouseX: number;
    mouseY: number;
    startWidth: number;
    startHeight: number;
    startX: number;
    startY: number;
  }>({ mouseX: 0, mouseY: 0, startWidth: 820, startHeight: 640, startX: 0, startY: 0 });

  // Reset position and size when modal opens, and pause media
  useEffect(() => {
    if (isOpen) {
      setPosition({ x: 0, y: 0 });
      setIsMaximized(false);
      // Pause playback when modal opens to avoid unwanted noise
      if (isPlaying && onTogglePlay) {
        onTogglePlay();
      }
    }
  }, [isOpen]);

  const handleHeaderMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isMaximized) return;
    if ((e.target as HTMLElement).closest("button, input, a, textarea, select")) {
      return;
    }

    setIsDraggingModal(true);
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startX: position.x,
      startY: position.y,
    };
  };

  useEffect(() => {
    if (!isDraggingModal) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStartRef.current.mouseX;
      const dy = e.clientY - dragStartRef.current.mouseY;
      setPosition({
        x: dragStartRef.current.startX + dx,
        y: dragStartRef.current.startY + dy,
      });
    };

    const handleMouseUp = () => {
      setIsDraggingModal(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDraggingModal]);

  // Window Resize Mouse Handler
  const handleResizeStart = (
    e: React.MouseEvent,
    direction: "right" | "bottom" | "corner"
  ) => {
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(direction);
    resizeStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startWidth: size.width,
      startHeight: size.height,
      startX: position.x,
      startY: position.y,
    };
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - resizeStartRef.current.mouseX;
      const dy = e.clientY - resizeStartRef.current.mouseY;

      let newWidth = resizeStartRef.current.startWidth;
      let newHeight = resizeStartRef.current.startHeight;
      let newX = resizeStartRef.current.startX;
      let newY = resizeStartRef.current.startY;

      if (isResizing === "right" || isResizing === "corner") {
        const maxWidth = Math.max(500, window.innerWidth - 48);
        newWidth = Math.max(480, Math.min(maxWidth, resizeStartRef.current.startWidth + dx));
        const deltaW = newWidth - resizeStartRef.current.startWidth;
        newX = resizeStartRef.current.startX + deltaW / 2;
      }

      if (isResizing === "bottom" || isResizing === "corner") {
        const maxHeight = Math.max(400, window.innerHeight - 48);
        newHeight = Math.max(400, Math.min(maxHeight, resizeStartRef.current.startHeight + dy));
        const deltaH = newHeight - resizeStartRef.current.startHeight;
        newY = resizeStartRef.current.startY + deltaH / 2;
      }

      setSize({ width: newWidth, height: newHeight });
      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsResizing(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  // --- Extracted Data State ---
  const [recordingTranscript, setRecordingTranscript] = useState<string>("");
  const [videoSubtitles, setVideoSubtitles] = useState<SubtitleItem[]>([]);
  const [sttError, setSttError] = useState<string | null>(null);

  // --- Fast AI Whisper API State ---
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem("whisper_api_key") || "");
  const [apiProvider, setApiProvider] = useState<"groq" | "openai">(
    () => (localStorage.getItem("whisper_provider") as "groq" | "openai") || "groq"
  );
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState<boolean>(false);
  const [isAiTranscribing, setIsAiTranscribing] = useState<boolean>(false);
  const [aiProgressText, setAiProgressText] = useState<string>("");

  // --- Unified Copy State ---
  const [copyMode, setCopyMode] = useState<CopyMode>("text_only");
  const [copiedType, setCopiedType] = useState<CopyMode | null>(null);
  const [isCopyMenuOpen, setIsCopyMenuOpen] = useState<boolean>(false);
  const copyMenuRef = useRef<HTMLDivElement>(null);

  // --- React Clear Confirmation Dialog State ---
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState<boolean>(false);

  // Close copy menu when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (copyMenuRef.current && !copyMenuRef.current.contains(e.target as Node)) {
        setIsCopyMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // --- Lyrics State ---
  const [lyricsQuery, setLyricsQuery] = useState("");
  const [lyricsLines, setLyricsLines] = useState<Array<{ time: number; text: string }>>([]);
  const [plainLyrics, setPlainLyrics] = useState("");
  const [isLoadingLyrics, setIsLoadingLyrics] = useState(false);
  const [lyricsCopied, setLyricsCopied] = useState(false);

  // Determine initial tab when opening based on track type
  useEffect(() => {
    if (isOpen) {
      if (defaultTab) {
        setActiveTab(defaultTab);
      } else if (currentTrack) {
        const lowerName = currentTrack.name.toLowerCase();
        if (currentTrack.mediaType === "video") {
          setActiveTab("video_stt");
        } else if (
          lowerName.includes("record") ||
          lowerName.includes("voice") ||
          lowerName.includes("call") ||
          lowerName.includes("meeting") ||
          lowerName.includes("memo") ||
          lowerName.includes("녹음") ||
          lowerName.includes("통화") ||
          lowerName.includes("회의")
        ) {
          setActiveTab("recording");
        } else {
          setActiveTab("lyrics");
        }
      }

      // Pre-fill query for lyrics
      if (currentTrack) {
        const cleaned = currentTrack.name.replace(/\.[^/.]+$/, "");
        setLyricsQuery(cleaned);
      }
    }
  }, [isOpen, currentTrack, defaultTab]);

  const cleanTrackTitle = currentTrack?.name.replace(/\.[^/.]+$/, "") || "";

  // Helper to format seconds as HH:MM:SS
  const formatTimecode = (sec: number) => {
    const s = Math.max(0, Math.floor(sec));
    const hours = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const secs = s % 60;
    return `[${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}]`;
  };

  // Save API Key to localStorage
  const handleSaveApiKey = (key: string, provider: "groq" | "openai") => {
    setApiKey(key);
    setApiProvider(provider);
    localStorage.setItem("whisper_api_key", key);
    localStorage.setItem("whisper_provider", provider);
    setIsApiKeyModalOpen(false);
  };

  // Open external URL in system default browser via @tauri-apps/plugin-opener
  const handleOpenExternalUrl = async (url: string) => {
    try {
      await openUrl(url);
    } catch (err) {
      console.warn("Failed to open URL via plugin-opener, fallback to window.open:", err);
      window.open(url, "_blank");
    }
  };

  // --- 🚀 Fast AI Whisper Transcription (Silent 1~2s Extraction) ---
  const transcribeWithAiWhisper = async () => {
    if (!currentTrack) {
      setSttError("No media file selected.");
      return;
    }

    // Ensure audio is paused
    if (isPlaying && onTogglePlay) {
      onTogglePlay();
    }

    const currentKey = apiKey.trim() || localStorage.getItem("whisper_api_key") || "";
    if (!currentKey) {
      setIsApiKeyModalOpen(true);
      return;
    }

    setIsAiTranscribing(true);
    setAiProgressText("Preparing audio file...");
    setSttError(null);

    try {
      // 1. Fetch file as Blob from Tauri asset protocol
      const fileUrl = convertFileSrc(currentTrack.path);
      const resFile = await fetch(fileUrl);
      if (!resFile.ok) {
        throw new Error("Failed to load local media file.");
      }
      const blob = await resFile.blob();

      setAiProgressText(`Transcribing with AI Whisper model (${selectedLang})...`);

      // 2. Prepare FormData
      const formData = new FormData();
      formData.append("file", blob, currentTrack.name);

      const langCode = selectedLang.split("-")[0]; // "ko", "en", "ja"
      formData.append("language", langCode);
      formData.append("response_format", "verbose_json");

      let endpoint = "";
      if (apiProvider === "groq") {
        endpoint = "https://api.groq.com/openai/v1/audio/transcriptions";
        formData.append("model", "whisper-large-v3");
      } else {
        endpoint = "https://api.openai.com/v1/audio/transcriptions";
        formData.append("model", "whisper-1");
      }

      // 3. Send request to Whisper API
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${currentKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const errorData = await response.json().catch(() => ({} as any));
        const errMsg = errorData.error?.message || `API request failed (HTTP ${response.status})`;
        throw new Error(errMsg);
      }

      const data = await response.json();

      // 4. Process segments or plain text
      if (data.segments && Array.isArray(data.segments) && data.segments.length > 0) {
        const subs: SubtitleItem[] = [];
        let transcriptText = "";

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const seg of data.segments as any[]) {
          const start = typeof seg.start === "number" ? seg.start : 0;
          const end = typeof seg.end === "number" ? seg.end : start + 2;
          const text = (seg.text || "").trim();
          const timecode = formatTimecode(start);

          transcriptText += `${timecode} ${text}\n`;
          subs.push({ start, end, text });
        }

        setRecordingTranscript(transcriptText);
        setVideoSubtitles(subs);
      } else if (data.text) {
        const timecode = formatTimecode(0);
        setRecordingTranscript(`${timecode} ${data.text.trim()}`);
        setVideoSubtitles([{ start: 0, end: duration || 10, text: data.text.trim() }]);
      }
    } catch (err: unknown) {
      console.error("AI Transcription failed:", err);
      const message = err instanceof Error ? err.message : String(err);
      setSttError(`Fast AI transcription failed: ${message}`);
    } finally {
      setIsAiTranscribing(false);
      setAiProgressText("");
    }
  };

  // --- Clear Transcripts via React Dialog ---
  const handleConfirmClear = () => {
    setRecordingTranscript("");
    setVideoSubtitles([]);
    setIsClearConfirmOpen(false);
  };

  // --- Copy Handlers ---
  const handleCopyRecording = (mode: CopyMode) => {
    if (!recordingTranscript) return;
    let textToCopy = "";
    if (mode === "text_only") {
      textToCopy = recordingTranscript
        .split("\n")
        .map((line) =>
          line.replace(/^\[\d{2}:\d{2}:\d{2}\]\s*|^\[\d{2}:\d{2}\.\d{2,3}\]\s*/, "").trim()
        )
        .filter((line) => line.length > 0)
        .join("\n");
    } else {
      textToCopy = recordingTranscript;
    }
    navigator.clipboard.writeText(textToCopy);
    setCopiedType(mode);
    setTimeout(() => setCopiedType(null), 1800);
  };

  const handleCopyVideo = (mode: CopyMode) => {
    if (videoSubtitles.length === 0) return;
    let textToCopy = "";
    if (mode === "text_only") {
      textToCopy = videoSubtitles
        .map((s) => s.text.trim())
        .filter(Boolean)
        .join("\n");
    } else {
      textToCopy = videoSubtitles
        .map((s) => `${formatTimecode(s.start)} ${s.text.trim()}`)
        .join("\n");
    }
    navigator.clipboard.writeText(textToCopy);
    setCopiedType(mode);
    setTimeout(() => setCopiedType(null), 1800);
  };

  const handleCopyLyrics = (text: string) => {
    navigator.clipboard.writeText(text);
    setLyricsCopied(true);
    setTimeout(() => setLyricsCopied(false), 1800);
  };

  // --- Unified Copy Button Component ---
  const renderUnifiedCopyButton = (onCopy: (mode: CopyMode) => void) => (
    <div className="unified-copy-wrapper" ref={copyMenuRef}>
      <div className="unified-copy-btn-group">
        <button
          className="unified-copy-main-btn"
          onClick={() => onCopy(copyMode)}
          title={copyMode === "text_only" ? "Copy text only to clipboard" : "Copy time + text to clipboard"}
        >
          {copiedType ? (
            <>
              <Check size={14} color="#10b981" />
              <span style={{ color: "#10b981", fontWeight: 600 }}>
                {copiedType === "text_only" ? "Text Copied!" : "Time+Text Copied!"}
              </span>
            </>
          ) : (
            <>
              <Copy size={14} />
              <span>{copyMode === "text_only" ? "Copy Text Only" : "Copy with Timestamps"}</span>
            </>
          )}
        </button>
        <button
          className={`unified-copy-arrow-btn ${isCopyMenuOpen ? "active" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            setIsCopyMenuOpen((prev) => !prev);
          }}
          title="Select copy format (Text only / With timestamps)"
        >
          <ChevronDown size={14} />
        </button>
      </div>

      {isCopyMenuOpen && (
        <div className="unified-copy-menu">
          <button
            className={`unified-copy-menu-item ${copyMode === "text_only" ? "active" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              setCopyMode("text_only");
              setIsCopyMenuOpen(false);
              onCopy("text_only");
            }}
          >
            <FileText size={15} color={copyMode === "text_only" ? "#818cf8" : "var(--text-secondary)"} />
            <div className="menu-item-text">
              <span className="item-title">📄 Copy Text Only</span>
              <span className="item-desc">Copy plain text without timestamp codes</span>
            </div>
            {copyMode === "text_only" && <Check size={13} color="#818cf8" />}
          </button>

          <button
            className={`unified-copy-menu-item ${copyMode === "with_time" ? "active" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              setCopyMode("with_time");
              setIsCopyMenuOpen(false);
              onCopy("with_time");
            }}
          >
            <Clock size={15} color={copyMode === "with_time" ? "#06b6d4" : "var(--text-secondary)"} />
            <div className="menu-item-text">
              <span className="item-title">⏱️ Copy with Timestamps</span>
              <span className="item-desc">Copy with [00:01:23] timecodes</span>
            </div>
            {copyMode === "with_time" && <Check size={13} color="#06b6d4" />}
          </button>
        </div>
      )}
    </div>
  );

  // --- Lyrics Fetching ---
  const fetchLyrics = async () => {
    if (!lyricsQuery.trim()) return;
    setIsLoadingLyrics(true);

    try {
      const parts = lyricsQuery.split("-").map((s) => s.trim());
      const queryParam = parts.length >= 2 ? `${parts[0]} ${parts[1]}` : lyricsQuery;

      const url = `https://lrclib.net/api/search?q=${encodeURIComponent(queryParam)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0 && data[0].syncedLyrics) {
          parseLrcLyrics(data[0].syncedLyrics);
          setPlainLyrics(data[0].plainLyrics || data[0].syncedLyrics);
          setIsLoadingLyrics(false);
          return;
        } else if (data && data.length > 0 && data[0].plainLyrics) {
          setPlainLyrics(data[0].plainLyrics);
          setLyricsLines([]);
          setIsLoadingLyrics(false);
          return;
        }
      }
    } catch (e) {
      console.warn("External lyrics fetch failed:", e);
    }

    setIsLoadingLyrics(false);
  };

  const parseLrcLyrics = (lrc: string) => {
    const lines = lrc.split("\n");
    const parsed: Array<{ time: number; text: string }> = [];
    const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;

    for (const line of lines) {
      const match = line.match(timeRegex);
      if (match) {
        const min = parseInt(match[1], 10);
        const sec = parseInt(match[2], 10);
        const ms = parseInt(match[3], 10) / (match[3].length === 2 ? 100 : 1000);
        const time = min * 60 + sec + ms;
        const text = line.replace(timeRegex, "").trim();
        if (text) {
          parsed.push({ time, text });
        }
      }
    }
    setLyricsLines(parsed);
  };

  if (!isOpen) return null;

  return (
    <div className="modaless-container">
      <div
        className={`modal-card smart-modal-card ${isMaximized ? "maximized" : "resizable"}`}
        style={
          isMaximized
            ? {
                position: "fixed",
                inset: "16px",
                width: "calc(100vw - 32px)",
                height: "calc(100vh - 32px)",
                maxWidth: "none",
                maxHeight: "none",
                transform: "none",
              }
            : {
                width: `${size.width}px`,
                height: `${size.height}px`,
                maxWidth: "calc(100vw - 32px)",
                maxHeight: "calc(100vh - 32px)",
                transform: `translate(${position.x}px, ${position.y}px)`,
              }
        }
        onClick={(e) => e.stopPropagation()}
      >
        {/* Draggable Header */}
        <div
          className={`smart-modal-header ${isDraggingModal ? "dragging" : ""}`}
          onMouseDown={handleHeaderMouseDown}
          title={isMaximized ? undefined : "Drag header to move window"}
        >
          <div className="smart-header-title">
            <div className="smart-icon-badge" style={{ padding: 2, overflow: "hidden" }}>
              <img src={appIcon} alt="MHMedia" style={{ width: "100%", height: "100%", borderRadius: "var(--radius-sm)", objectFit: "contain" }} />
            </div>
            <div>
              <h3>Smart Media Assistant</h3>
              <p className="smart-header-sub">
                {currentTrack
                  ? `"${cleanTrackTitle}" AI Analysis & Extraction`
                  : "Please select a media file"}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Language Selector */}
            <div className="lang-selector-group" title="Target transcription language">
              <Languages size={15} color="#818cf8" />
              <button
                className={`lang-pill-btn ${selectedLang === "ko-KR" ? "active" : ""}`}
                onClick={() => setSelectedLang("ko-KR")}
                title="Korean Recognition"
              >
                🇰🇷 한국어
              </button>
              <button
                className={`lang-pill-btn ${selectedLang === "en-US" ? "active" : ""}`}
                onClick={() => setSelectedLang("en-US")}
                title="English Recognition"
              >
                🇺🇸 English
              </button>
              <button
                className={`lang-pill-btn ${selectedLang === "ja-JP" ? "active" : ""}`}
                onClick={() => setSelectedLang("ja-JP")}
                title="Japanese Recognition"
              >
                🇯🇵 日本語
              </button>
            </div>

            {/* API Key Config Button */}
            <button
              className="btn-icon-only"
              title="Configure AI API Key (Groq / OpenAI)"
              onClick={() => setIsApiKeyModalOpen(true)}
            >
              <Key size={17} color={apiKey ? "#10b981" : "#94a3b8"} />
            </button>

            {/* Maximize / Restore Toggle */}
            <button
              className="btn-icon-only"
              onClick={() => setIsMaximized((prev) => !prev)}
              title={isMaximized ? "Restore size" : "Maximize window"}
            >
              {isMaximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>

            <button className="btn-icon-only" onClick={onClose} title="Close">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="smart-tab-bar">
          <button
            className={`smart-tab-btn ${activeTab === "recording" ? "active" : ""}`}
            onClick={() => setActiveTab("recording")}
          >
            <Mic size={15} /> 🎙️ Voice to Text (STT)
          </button>
          <button
            className={`smart-tab-btn ${activeTab === "lyrics" ? "active" : ""}`}
            onClick={() => setActiveTab("lyrics")}
          >
            <Music size={15} /> 🎵 Lyrics & Time Sync
          </button>
          <button
            className={`smart-tab-btn ${activeTab === "video_stt" ? "active" : ""}`}
            onClick={() => setActiveTab("video_stt")}
          >
            <Film size={15} /> 🎬 Video Transcript (STT)
          </button>
        </div>

        {/* Tab Body */}
        <div className="smart-tab-content">
          {/* 1. Voice Recording STT Tab */}
          {activeTab === "recording" && (
            <div className="smart-tab-pane">
              <div className="pane-intro">
                <strong>🎙️ High-Speed AI Speech-to-Text (Silent Extraction)</strong>
                <p>
                  Click <strong>[🚀 Fast AI Transcribe]</strong> to analyze the audio file silently in the background in 2~3 seconds and extract timestamped transcripts. (No microphone permission required)
                </p>
              </div>

              {/* Error Alert */}
              {sttError && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    background: "rgba(239, 68, 68, 0.15)",
                    border: "1px solid rgba(239, 68, 68, 0.4)",
                    color: "#fca5a5",
                    padding: "10px 14px",
                    borderRadius: "var(--radius-md)",
                    fontSize: "0.82rem",
                  }}
                >
                  <AlertCircle size={16} />
                  <span>{sttError}</span>
                </div>
              )}

              {/* Action Buttons Row */}
              <div className="pane-actions-row">
                {/* 1. Fast AI Whisper Button (No playback, 2-sec speed) */}
                <button
                  className="btn btn-primary"
                  onClick={transcribeWithAiWhisper}
                  disabled={isAiTranscribing}
                  style={{ background: "linear-gradient(135deg, #6366f1, #06b6d4)" }}
                  title="Silently extract text from the file in 1-2 seconds without playing audio"
                >
                  {isAiTranscribing ? (
                    <>
                      <Loader2 size={15} className="spinner-anim" /> AI analyzing...
                    </>
                  ) : (
                    <>
                      <Zap size={15} /> 🚀 Fast AI Transcribe (Silent)
                    </>
                  )}
                </button>

                {/* API Key Settings Button */}
                <button
                  className="btn btn-secondary"
                  onClick={() => setIsApiKeyModalOpen(true)}
                  style={{ padding: "6px 10px", fontSize: "0.78rem" }}
                  title="Configure free Groq or OpenAI API Key"
                >
                  <Key size={13} color={apiKey ? "#10b981" : "#94a3b8"} />
                  {apiKey ? "API Key Configured" : "Set API Key"}
                </button>

                {recordingTranscript && (
                  <>
                    {/* Unified Copy Button (Text Only & With Time) */}
                    {renderUnifiedCopyButton(handleCopyRecording)}

                    <button
                      className="btn btn-secondary"
                      onClick={() => setIsClearConfirmOpen(true)}
                      title="Clear transcript"
                    >
                      <Trash2 size={14} /> Clear
                    </button>
                  </>
                )}
              </div>

              {/* Progress State Indicator */}
              {isAiTranscribing && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 14px",
                    background: "rgba(99, 102, 241, 0.15)",
                    border: "1px solid rgba(99, 102, 241, 0.4)",
                    borderRadius: "var(--radius-md)",
                    fontSize: "0.85rem",
                    color: "#a5b4fc",
                  }}
                >
                  <Loader2 size={16} className="spinner-anim" />
                  <span>{aiProgressText}</span>
                </div>
              )}

              {/* Editable Transcript Text Area */}
              <div className="transcript-box">
                {recordingTranscript ? (
                  <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 8,
                        fontSize: "0.75rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Edit3 size={12} /> Extracted transcript. You can edit directly or copy using the button above.
                      </span>
                      <span>Language: {selectedLang}</span>
                    </div>
                    <textarea
                      className="transcript-textarea"
                      value={recordingTranscript}
                      onChange={(e) => setRecordingTranscript(e.target.value)}
                      rows={11}
                      placeholder="Extracted transcript content..."
                    />
                  </div>
                ) : (
                  <div className="empty-panel-prompt">
                    Click <strong>"🚀 Fast AI Transcribe (Silent)"</strong> above to silently analyze the entire audio file in 1~2 seconds and extract timestamped transcripts.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 2. Music Lyrics Tab */}
          {activeTab === "lyrics" && (
            <div className="smart-tab-pane">
              <div className="pane-intro">
                <strong>🎵 Music Lyrics Assistant</strong>
                <p>
                  Search by song title and artist to look up synchronized lyrics with auto-scrolling and real-time highlighting.
                </p>
              </div>

              <div className="lyrics-search-row">
                <input
                  type="text"
                  className="search-input"
                  style={{ flex: 1 }}
                  placeholder="Song title or 'Artist - Song'..."
                  value={lyricsQuery}
                  onChange={(e) => setLyricsQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && fetchLyrics()}
                />
                <button
                  className="btn btn-primary"
                  onClick={fetchLyrics}
                  disabled={isLoadingLyrics}
                >
                  <Search size={15} /> {isLoadingLyrics ? "Searching..." : "Fetch Lyrics"}
                </button>
              </div>

              {lyricsLines.length > 0 ? (
                <div className="lyrics-viewer-box">
                  <div className="lyrics-toolbar">
                    <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                      Click any lyric line to jump to that timestamp.
                    </span>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: "4px 10px", fontSize: "0.75rem" }}
                      onClick={() => {
                        const allLyrics = lyricsLines.map((l) => l.text).join("\n");
                        handleCopyLyrics(allLyrics);
                      }}
                    >
                      {lyricsCopied ? (
                        <>
                          <Check size={13} color="#10b981" />{" "}
                          <span style={{ color: "#10b981" }}>Lyrics Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={13} /> Copy Lyrics
                        </>
                      )}
                    </button>
                  </div>

                  <div className="lyrics-lines-container">
                    {lyricsLines.map((line, idx) => {
                      const isCurrent =
                        currentTime >= line.time &&
                        (idx === lyricsLines.length - 1 ||
                          currentTime < lyricsLines[idx + 1].time);

                      return (
                        <div
                          key={idx}
                          className={`lyrics-line ${isCurrent ? "current" : ""}`}
                          onClick={() => onSeek(line.time)}
                        >
                          <span className="lrc-time">
                            {Math.floor(line.time / 60)
                              .toString()
                              .padStart(2, "0")}
                            :
                            {Math.floor(line.time % 60)
                              .toString()
                              .padStart(2, "0")}
                          </span>
                          <span className="lrc-text">{line.text}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : plainLyrics ? (
                <div className="lyrics-viewer-box">
                  <div className="lyrics-toolbar">
                    <button
                      className="btn btn-secondary"
                      style={{ padding: "4px 10px", fontSize: "0.75rem" }}
                      onClick={() => handleCopyLyrics(plainLyrics)}
                    >
                      {lyricsCopied ? (
                        <>
                          <Check size={13} color="#10b981" />{" "}
                          <span style={{ color: "#10b981" }}>Lyrics Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={13} /> Copy Lyrics
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="transcript-text">{plainLyrics}</pre>
                </div>
              ) : (
                <div className="empty-panel-prompt">
                  Click "Fetch Lyrics" in the search box above to load and view synchronized lyrics.
                </div>
              )}
            </div>
          )}

          {/* 3. Video Subtitles & STT Tab */}
          {activeTab === "video_stt" && (
            <div className="smart-tab-pane">
              <div className="pane-intro">
                <strong>🎬 Video Transcript (STT) Assistant</strong>
                <p>
                  Click <strong>[🚀 Fast AI Transcript]</strong> to analyze video audio silently in 2~3 seconds and extract complete timestamped transcripts without video playback.
                </p>
              </div>

              {/* Action Buttons Row */}
              <div className="pane-actions-row">
                {/* 1. Fast AI Whisper Button for Video */}
                <button
                  className="btn btn-primary"
                  onClick={transcribeWithAiWhisper}
                  disabled={isAiTranscribing}
                  style={{ background: "linear-gradient(135deg, #6366f1, #06b6d4)" }}
                  title="Silently extract full transcript in 1-2 seconds without playing video"
                >
                  {isAiTranscribing ? (
                    <>
                      <Loader2 size={15} className="spinner-anim" /> AI analyzing transcript...
                    </>
                  ) : (
                    <>
                      <Zap size={15} /> 🚀 Fast AI Transcript (Silent)
                    </>
                  )}
                </button>

                {/* API Key Settings Button */}
                <button
                  className="btn btn-secondary"
                  onClick={() => setIsApiKeyModalOpen(true)}
                  style={{ padding: "6px 10px", fontSize: "0.78rem" }}
                >
                  <Key size={13} color={apiKey ? "#10b981" : "#94a3b8"} />
                  {apiKey ? "API Key Configured" : "Set API Key"}
                </button>

                {videoSubtitles.length > 0 && (
                  <>
                    {/* Unified Copy Button (Text Only & With Time) */}
                    {renderUnifiedCopyButton(handleCopyVideo)}

                    <button
                      className="btn btn-secondary"
                      onClick={() => setIsClearConfirmOpen(true)}
                      title="Clear transcript"
                    >
                      <Trash2 size={14} /> Clear
                    </button>
                  </>
                )}
              </div>

              {/* Subtitles List Box */}
              <div className="subtitles-list-box">
                {videoSubtitles.length > 0 ? (
                  videoSubtitles.map((sub, idx) => {
                    const isActive =
                      currentTime >= sub.start && currentTime <= sub.end;

                    return (
                      <div
                        key={idx}
                        className={`subtitle-item ${isActive ? "active" : ""}`}
                        onClick={() => onSeek(sub.start)}
                        title="Click to jump to this scene"
                      >
                        <span className="subtitle-time">
                          {Math.floor(sub.start / 60)
                            .toString()
                            .padStart(2, "0")}
                          :
                          {Math.floor(sub.start % 60)
                            .toString()
                            .padStart(2, "0")}
                        </span>
                        <span className="subtitle-text">{sub.text}</span>
                      </div>
                    );
                  })
                ) : (
                  <div className="empty-panel-prompt">
                    Click <strong>"🚀 Fast AI Transcript (Silent)"</strong> above to silently extract full transcripts and timecode cues without playing the video.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Horizontal and Vertical Resize Drag Handles */}
        {!isMaximized && (
          <>
            <div
              className="resize-handle-edge-right"
              onMouseDown={(e) => handleResizeStart(e, "right")}
              title="Drag to resize width"
            />
            <div
              className="resize-handle-edge-bottom"
              onMouseDown={(e) => handleResizeStart(e, "bottom")}
              title="Drag to resize height"
            />
            <div
              className="resize-handle-corner"
              onMouseDown={(e) => handleResizeStart(e, "corner")}
              title="Drag to resize width & height"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M10 2L2 10M10 6L6 10M10 10L9 10" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
          </>
        )}
      </div>

      {/* 1. React Clear Confirmation Dialog */}
      {isClearConfirmOpen && (
        <div
          className="modal-overlay"
          style={{ zIndex: 120, pointerEvents: "auto" }}
          onClick={() => setIsClearConfirmOpen(false)}
        >
          <div
            className="modal-card"
            style={{ maxWidth: 420, pointerEvents: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: "rgba(239, 68, 68, 0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#ef4444",
                  }}
                >
                  <Trash2 size={20} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: "1rem", color: "#fff", fontWeight: 600 }}>Confirm Clear Transcript</h4>
                  <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--text-muted)" }}>
                    Reset {activeTab === "video_stt" ? "video subtitles & transcript" : "voice recording transcript"}
                  </p>
                </div>
              </div>
              <button
                className="btn-icon-only"
                onClick={() => setIsClearConfirmOpen(false)}
                title="Close"
              >
                <X size={16} />
              </button>
            </div>

            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.6, margin: "14px 0 20px 0" }}>
              All currently extracted transcript lines and timestamp data will be permanently cleared.<br />
              Are you sure you want to proceed?
            </p>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                className="btn btn-secondary"
                onClick={() => setIsClearConfirmOpen(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                style={{
                  background: "linear-gradient(135deg, #ef4444, #dc2626)",
                  boxShadow: "0 4px 14px rgba(239, 68, 68, 0.35)",
                }}
                onClick={handleConfirmClear}
              >
                <Trash2 size={14} /> Clear (Delete)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. API Key Setting Modal Overlay */}
      {isApiKeyModalOpen && (
        <div
          className="modal-overlay"
          style={{ zIndex: 110, pointerEvents: "auto" }}
          onClick={() => setIsApiKeyModalOpen(false)}
        >
          <div
            className="modal-card"
            style={{ maxWidth: 460, pointerEvents: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Key size={18} color="#6366f1" />
                <span className="modal-title">AI Transcription API Key Settings</span>
              </div>
              <button
                className="btn-icon-only"
                onClick={() => setIsApiKeyModalOpen(false)}
                title="Close"
              >
                <X size={16} />
              </button>
            </div>

            <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginBottom: 16 }}>
              To extract speech to text silently in 1-2 seconds without playing audio, please register a <strong>free Groq API Key</strong> or OpenAI Key.
            </p>

            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <button
                className={`lang-pill-btn ${apiProvider === "groq" ? "active" : ""}`}
                style={{ flex: 1, padding: "8px", borderRadius: "var(--radius-sm)" }}
                onClick={() => setApiProvider("groq")}
              >
                ⚡ Groq Whisper (Free & Recommended)
              </button>
              <button
                className={`lang-pill-btn ${apiProvider === "openai" ? "active" : ""}`}
                style={{ flex: 1, padding: "8px", borderRadius: "var(--radius-sm)" }}
                onClick={() => setApiProvider("openai")}
              >
                OpenAI Whisper
              </button>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: 6 }}>
                {apiProvider === "groq" ? "Groq API Key (gsk_...)" : "OpenAI API Key (sk-...)"}
              </label>
              <input
                type="password"
                className="search-input"
                placeholder={apiProvider === "groq" ? "gsk_..." : "sk-..."}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>

            {apiProvider === "groq" ? (
              <div
                style={{
                  background: "rgba(99, 102, 241, 0.08)",
                  border: "1px solid rgba(99, 102, 241, 0.2)",
                  padding: "10px 14px",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "0.78rem",
                  marginBottom: 18,
                  color: "#c7d2fe",
                }}
              >
                💡 <strong>How to get a free Groq API key (Recommended):</strong>
                <div style={{ marginTop: 4, lineHeight: 1.6 }}>
                  <button
                    type="button"
                    onClick={() => handleOpenExternalUrl("https://console.groq.com/keys")}
                    style={{
                      background: "none",
                      border: "none",
                      padding: 0,
                      color: "#06b6d4",
                      textDecoration: "underline",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: "0.78rem",
                      fontWeight: 600,
                    }}
                    title="Open Groq API Key page in default browser"
                  >
                    console.groq.com/keys <ExternalLink size={12} />
                  </button>
                  {" "}Sign up for free without a credit card to generate an API key and start transcribing at ultra-high speed.
                </div>
              </div>
            ) : (
              <div
                style={{
                  background: "rgba(16, 185, 129, 0.08)",
                  border: "1px solid rgba(16, 185, 129, 0.2)",
                  padding: "10px 14px",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "0.78rem",
                  marginBottom: 18,
                  color: "#a7f3d0",
                }}
              >
                💡 <strong>How to get an OpenAI API key:</strong>
                <div style={{ marginTop: 4, lineHeight: 1.6 }}>
                  <button
                    type="button"
                    onClick={() => handleOpenExternalUrl("https://platform.openai.com/api-keys")}
                    style={{
                      background: "none",
                      border: "none",
                      padding: 0,
                      color: "#10b981",
                      textDecoration: "underline",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: "0.78rem",
                      fontWeight: 600,
                    }}
                    title="Open OpenAI API Key page in default browser"
                  >
                    platform.openai.com/api-keys <ExternalLink size={12} />
                  </button>
                  {" "}Log in to OpenAI Platform to create a Secret Key (sk-...) and use the Whisper-1 model.
                </div>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                className="btn btn-secondary"
                onClick={() => setIsApiKeyModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={() => handleSaveApiKey(apiKey, apiProvider)}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
