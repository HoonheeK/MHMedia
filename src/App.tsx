import { useState, useRef, useEffect, useCallback } from "react";
import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import { MediaItem, RepeatMode } from "./types/media";
import { PlayerControls } from "./components/PlayerControls";
import { Playlist } from "./components/Playlist";
import { AudioVisualizer } from "./components/AudioVisualizer";
import { ShortcutsModal } from "./components/ShortcutsModal";
import { SmartAssistantModal, AssistantTab } from "./components/SmartAssistantModal";
import { AboutDialog } from "./components/AboutDialog";
import { OpenLicenseDialog } from "./components/OpenLicenseDialog";
import { LicenseAndUpdateDialog } from "./components/LicenseAndUpdateDialog";
import {
  Music,
  FolderOpen,
  FilePlus,
  PlayCircle,
  HelpCircle,
  Sparkles,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Mic,
  Film,
  UploadCloud,
  AlertCircle,
  Menu,
  Info,
  ShieldCheck,
  BookOpen,
  Minimize2,
  Maximize2,
} from "lucide-react";
import appIcon from "./assets/app-icon.png";
import "./App.css";

interface RustMediaFileInfo {
  name: string;
  path: string;
  extension: string;
  size_bytes: number;
  media_type: "audio" | "video";
}

interface OsdState {
  icon: React.ReactNode;
  text: string;
}

function App() {
  const [playlist, setPlaylist] = useState<MediaItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(0.8);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>("off");
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [isPlaylistOpen, setIsPlaylistOpen] = useState<boolean>(true);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState<boolean>(false);
  const [isCompact, setIsCompact] = useState<boolean>(false);

  // Smart Assistant Modal state
  const [isSmartModalOpen, setIsSmartModalOpen] = useState<boolean>(false);
  const [smartModalTab, setSmartModalTab] = useState<AssistantTab>("recording");

  // Main Hamburger Menu & Dialogs state (Referenced from TreeDiadev)
  const [isMainMenuOpen, setIsMainMenuOpen] = useState<boolean>(false);
  const [isAboutOpen, setIsAboutOpen] = useState<boolean>(false);
  const [isLicensesOpen, setIsLicensesOpen] = useState<boolean>(false);
  const [isLicenseUpdateOpen, setIsLicenseUpdateOpen] = useState<boolean>(false);
  const mainMenuRef = useRef<HTMLDivElement>(null);

  // Close hamburger menu on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (mainMenuRef.current && !mainMenuRef.current.contains(e.target as Node)) {
        setIsMainMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Fullscreen and auto-hide controls state
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [hideControls, setHideControls] = useState<boolean>(false);
  const [isDraggingFiles, setIsDraggingFiles] = useState<boolean>(false);
  const idleTimerRef = useRef<number | null>(null);
  const isHoveringControlsRef = useRef<boolean>(false);

  // OSD (On-Screen Display) feedback
  const [osd, setOsd] = useState<OsdState | null>(null);
  const osdTimerRef = useRef<number | null>(null);

  const showOsd = useCallback((icon: React.ReactNode, text: string) => {
    if (osdTimerRef.current) {
      window.clearTimeout(osdTimerRef.current);
      osdTimerRef.current = null;
    }
    setOsd({ icon, text });
    osdTimerRef.current = window.setTimeout(() => {
      setOsd(null);
      osdTimerRef.current = null;
    }, 700);
  }, []);

  // Clean up OSD timer on unmount
  useEffect(() => {
    return () => {
      if (osdTimerRef.current) {
        window.clearTimeout(osdTimerRef.current);
      }
    };
  }, []);

  const appContainerRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const clickTimerRef = useRef<number | null>(null);

  const currentTrack =
    currentIndex >= 0 && currentIndex < playlist.length
      ? playlist[currentIndex]
      : null;

  // Determine suggested action based on media type and name
  const getSuggestedAction = useCallback(() => {
    if (!currentTrack) return null;
    const lowerName = currentTrack.name.toLowerCase();

    if (currentTrack.mediaType === "video") {
      return {
        tab: "video_stt" as AssistantTab,
        label: "Extract Video Transcript (STT)",
        icon: <Film size={14} color="#06b6d4" />,
      };
    }

    if (
      lowerName.includes("녹음") ||
      lowerName.includes("record") ||
      lowerName.includes("voice") ||
      lowerName.includes("통화") ||
      lowerName.includes("회의") ||
      lowerName.includes("memo")
    ) {
      return {
        tab: "recording" as AssistantTab,
        label: "Voice Recording to Text (STT)",
        icon: <Mic size={14} color="#ec4899" />,
      };
    }

    return {
      tab: "lyrics" as AssistantTab,
      label: "Real-time Synced Lyrics",
      icon: <Music size={14} color="#818cf8" />,
    };
  }, [currentTrack]);

  // Active media element (either audio or video)
  const getActiveMediaElement = useCallback((): HTMLMediaElement | null => {
    if (!currentTrack) return null;
    return currentTrack.mediaType === "video" ? videoRef.current : audioRef.current;
  }, [currentTrack]);

  const handleOpenSmartModal = useCallback(
    (tab?: AssistantTab) => {
      // 동영상/오디오 대본 추출 및 스마트 모달 실행 시 자동 재생 방지 및 일시정지
      const el = getActiveMediaElement();
      if (el) {
        el.pause();
      }
      setIsPlaying(false);

      if (tab) {
        setSmartModalTab(tab);
      } else {
        const suggested = getSuggestedAction();
        if (suggested) {
          setSmartModalTab(suggested.tab);
        }
      }
      setIsSmartModalOpen(true);
    },
    [getActiveMediaElement, getSuggestedAction]
  );

  // Sync volume and playback rate to active element
  useEffect(() => {
    const el = getActiveMediaElement();
    if (el) {
      el.volume = isMuted ? 0 : volume;
      el.playbackRate = playbackRate;
    }
  }, [volume, isMuted, playbackRate, getActiveMediaElement]);

  // Handle Play/Pause
  const togglePlay = useCallback(() => {
    const el = getActiveMediaElement();
    if (!el || !currentTrack) return;

    if (isPlaying) {
      el.pause();
      setIsPlaying(false);
      showOsd(<Pause size={36} className="osd-icon" />, "Pause");
    } else {
      el.play()
        .then(() => {
          setIsPlaying(true);
          showOsd(<Play size={36} className="osd-icon" />, "Play");
        })
        .catch((err) => console.error("Play error:", err));
    }
  }, [isPlaying, currentTrack, getActiveMediaElement, showOsd]);

  // Next track
  const playNext = useCallback(() => {
    if (playlist.length === 0) return;

    if (repeatMode === "one") {
      const el = getActiveMediaElement();
      if (el) {
        el.currentTime = 0;
        el.play().catch(console.error);
        setIsPlaying(true);
      }
      return;
    }

    if (isShuffle && playlist.length > 1) {
      let randomIndex = Math.floor(Math.random() * playlist.length);
      while (randomIndex === currentIndex) {
        randomIndex = Math.floor(Math.random() * playlist.length);
      }
      setCurrentIndex(randomIndex);
      setIsPlaying(true);
      return;
    }

    if (currentIndex + 1 < playlist.length) {
      setCurrentIndex(currentIndex + 1);
      setIsPlaying(true);
    } else if (repeatMode === "all") {
      setCurrentIndex(0);
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
    }
  }, [playlist.length, repeatMode, isShuffle, currentIndex, getActiveMediaElement]);

  // Prev track
  const playPrev = useCallback(() => {
    if (playlist.length === 0) return;
    const el = getActiveMediaElement();
    if (el && el.currentTime > 3) {
      el.currentTime = 0;
      return;
    }

    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsPlaying(true);
    } else if (repeatMode === "all") {
      setCurrentIndex(playlist.length - 1);
      setIsPlaying(true);
    }
  }, [playlist.length, getActiveMediaElement, currentIndex, repeatMode]);

  // Seek time
  const handleSeek = useCallback(
    (newTime: number) => {
      const el = getActiveMediaElement();
      if (el && Number.isFinite(newTime)) {
        try {
          const clampedTime = Math.max(0, Math.min(Number.isFinite(el.duration) ? el.duration : newTime, newTime));
          el.currentTime = clampedTime;
          setCurrentTime(clampedTime);
        } catch (err) {
          console.warn("Seek error:", err);
        }
      }
    },
    [getActiveMediaElement]
  );

  // Skip time forward/backward
  const handleSkipTime = useCallback(
    (offset: number) => {
      const el = getActiveMediaElement();
      if (el) {
        const nextTime = Math.max(0, Math.min(el.duration || 0, el.currentTime + offset));
        el.currentTime = nextTime;
        if (offset < 0) {
          showOsd(<RotateCcw size={36} className="osd-icon" />, `${Math.abs(offset)}s Backward`);
        } else {
          showOsd(<RotateCw size={36} className="osd-icon" />, `${offset}s Forward`);
        }
      }
    },
    [getActiveMediaElement, showOsd]
  );

  // Toggle Mute
  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      if (next) {
        showOsd(<VolumeX size={36} className="osd-icon" />, "Muted");
      } else {
        showOsd(<Volume2 size={36} className="osd-icon" />, `${Math.round(volume * 100)}%`);
      }
      return next;
    });
  }, [showOsd, volume]);

  // Volume Adjustment with OSD
  const adjustVolume = useCallback(
    (delta: number) => {
      setIsMuted(false);
      setVolume((prev) => {
        const next = Math.max(0, Math.min(1, parseFloat((prev + delta).toFixed(2))));
        showOsd(<Volume2 size={36} className="osd-icon" />, `${Math.round(next * 100)}%`);
        return next;
      });
    },
    [showOsd]
  );

  // Speed rate cycle
  const cyclePlaybackRate = () => {
    const rates = [0.5, 0.75, 1, 1.25, 1.5, 2];
    const nextIndex = (rates.indexOf(playbackRate) + 1) % rates.length;
    const nextRate = rates[nextIndex];
    setPlaybackRate(nextRate);
    showOsd(<Sparkles size={36} className="osd-icon" />, `Speed: ${nextRate}x`);
  };

  // Repeat mode cycle
  const cycleRepeatMode = useCallback(() => {
    setRepeatMode((prev) => {
      const next = prev === "off" ? "all" : prev === "all" ? "one" : "off";
      const label = next === "all" ? "Repeat All" : next === "one" ? "Repeat One" : "Repeat Off";
      showOsd(<Sparkles size={36} className="osd-icon" />, label);
      return next;
    });
  }, [showOsd]);

  // Toggle Compact Mode
  const toggleCompactMode = useCallback(async () => {
    try {
      const next = !isCompact;
      setIsCompact(next);
      if (next) {
        setIsPlaylistOpen(false);
      }
      await invoke("set_compact_mode", { enable: next });
      showOsd(
        <Minimize2 size={36} className="osd-icon" />,
        next ? "Compact Mode" : "Standard Mode"
      );
    } catch (err) {
      console.error("Failed to toggle compact mode:", err);
    }
  }, [isCompact, showOsd]);

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!appContainerRef.current) return;
    if (!document.fullscreenElement) {
      appContainerRef.current.requestFullscreen().catch(console.error);
    } else {
      document.exitFullscreen().catch(console.error);
    }
  }, []);

  // Sync fullscreen state with document event
  useEffect(() => {
    const handleFullscreenChange = () => {
      const active = Boolean(document.fullscreenElement);
      setIsFullscreen(active);
      if (!active) {
        setHideControls(false);
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Fullscreen Mouse Idle Auto-hide
  const resetIdleTimer = useCallback(() => {
    setHideControls(false);
    if (idleTimerRef.current) {
      window.clearTimeout(idleTimerRef.current);
    }
    if (isFullscreen && !isHoveringControlsRef.current) {
      idleTimerRef.current = window.setTimeout(() => {
        setHideControls(true);
      }, 2500);
    }
  }, [isFullscreen]);

  const handleMouseMove = () => {
    resetIdleTimer();
  };

  // Select track from playlist
  const handleSelectTrack = (index: number) => {
    setCurrentIndex(index);
    setIsPlaying(true);
  };

  // Remove track
  const handleRemoveTrack = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const trackIndex = playlist.findIndex((item) => item.id === id);
    if (trackIndex === -1) return;

    const newPlaylist = playlist.filter((item) => item.id !== id);
    setPlaylist(newPlaylist);

    if (trackIndex === currentIndex) {
      if (newPlaylist.length === 0) {
        setCurrentIndex(-1);
        setIsPlaying(false);
      } else if (trackIndex >= newPlaylist.length) {
        setCurrentIndex(0);
      }
    } else if (trackIndex < currentIndex) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  // Clear playlist
  const handleClearPlaylist = () => {
    setPlaylist([]);
    setCurrentIndex(-1);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  };

  // Open file dialog
  const handleOpenFile = async () => {
    try {
      const selected = await open({
        multiple: true,
        filters: [
          {
            name: "Media Files",
            extensions: [
              "mp3", "wav", "flac", "ogg", "aac", "m4a",
              "mp4", "webm", "mkv", "mov", "avi", "wmv"
            ],
          },
          {
            name: "Audio Files",
            extensions: ["mp3", "wav", "flac", "ogg", "aac", "m4a", "wma"],
          },
          {
            name: "Video Files",
            extensions: ["mp4", "webm", "mkv", "mov", "avi", "wmv", "flv"],
          },
          { name: "All Files", extensions: ["*"] },
        ],
      });

      if (!selected) return;

      const filePaths = Array.isArray(selected) ? selected : [selected];
      const newItems: MediaItem[] = [];

      for (const filePath of filePaths) {
        try {
          const info = await invoke<RustMediaFileInfo>("inspect_media_file", {
            filePath,
          });
          newItems.push({
            id: `${info.path}_${Date.now()}_${Math.random()}`,
            name: info.name,
            path: info.path,
            extension: info.extension,
            sizeBytes: info.size_bytes,
            mediaType: info.media_type,
          });
        } catch (e) {
          console.warn("Failed to inspect file:", filePath, e);
        }
      }

      if (newItems.length > 0) {
        setPlaylist((prev) => {
          const updated = [...prev, ...newItems];
          if (currentIndex === -1) {
            setCurrentIndex(prev.length);
            setIsPlaying(true);
          }
          return updated;
        });
      }
    } catch (err) {
      console.error("Open file error:", err);
    }
  };

  // Open folder dialog
  const handleOpenFolder = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
      });

      if (!selected || typeof selected !== "string") return;

      const scannedFiles = await invoke<RustMediaFileInfo[]>("scan_media_folder", {
        folderPath: selected,
      });

      if (scannedFiles && scannedFiles.length > 0) {
        const newItems: MediaItem[] = scannedFiles.map((info) => ({
          id: `${info.path}_${Date.now()}_${Math.random()}`,
          name: info.name,
          path: info.path,
          extension: info.extension,
          sizeBytes: info.size_bytes,
          mediaType: info.media_type,
        }));

        setPlaylist((prev) => {
          const updated = [...prev, ...newItems];
          if (currentIndex === -1) {
            setCurrentIndex(prev.length);
            setIsPlaying(true);
          }
          return updated;
        });
      }
    } catch (err) {
      console.error("Open folder error:", err);
    }
  };

  const lastDropTimeRef = useRef<number>(0);

  // Process dropped file and folder paths
  const handleProcessDroppedPaths = useCallback(
    async (paths: string[]) => {
      const now = Date.now();
      // Prevent duplicate event triggers within 800ms
      if (now - lastDropTimeRef.current < 800) {
        return;
      }
      lastDropTimeRef.current = now;

      const uniquePaths = Array.from(new Set(paths));
      const newItems: MediaItem[] = [];

      for (const filePath of uniquePaths) {
        try {
          // 1. Try inspect_media_file first (for individual media file)
          const info = await invoke<RustMediaFileInfo>("inspect_media_file", {
            filePath,
          });
          newItems.push({
            id: `${info.path}_${Date.now()}_${Math.random()}`,
            name: info.name,
            path: info.path,
            extension: info.extension,
            sizeBytes: info.size_bytes,
            mediaType: info.media_type,
          });
        } catch {
          // 2. If it's a folder or non-direct file, try scan_media_folder
          try {
            const folderFiles = await invoke<RustMediaFileInfo[]>(
              "scan_media_folder",
              { folderPath: filePath }
            );
            if (folderFiles && folderFiles.length > 0) {
              for (const info of folderFiles) {
                newItems.push({
                  id: `${info.path}_${Date.now()}_${Math.random()}`,
                  name: info.name,
                  path: info.path,
                  extension: info.extension,
                  sizeBytes: info.size_bytes,
                  mediaType: info.media_type,
                });
              }
            }
          } catch (e) {
            console.warn("Failed to process dropped path:", filePath, e);
          }
        }
      }

      if (newItems.length > 0) {
        setPlaylist((prev) => {
          const updated = [...prev, ...newItems];
          if (currentIndex === -1) {
            setCurrentIndex(prev.length);
            setIsPlaying(true);
          }
          return updated;
        });
        showOsd(
          <FilePlus size={36} className="osd-icon" />,
          `Added ${newItems.length} item(s)`
        );
      } else {
        showOsd(
          <AlertCircle size={36} className="osd-icon" />,
          "No media files found"
        );
      }
    },
    [currentIndex, showOsd]
  );

  // Tauri Native Drag & Drop Event Listener
  useEffect(() => {
    let unlistenFn: (() => void) | null = null;

    const setupDragDrop = async () => {
      try {
        const appWindow = getCurrentWebviewWindow();
        unlistenFn = await appWindow.onDragDropEvent((event) => {
          if (event.payload.type === "enter" || event.payload.type === "over") {
            setIsDraggingFiles(true);
          } else if (event.payload.type === "leave") {
            setIsDraggingFiles(false);
          } else if (event.payload.type === "drop") {
            setIsDraggingFiles(false);
            const droppedPaths = event.payload.paths;
            if (droppedPaths && droppedPaths.length > 0) {
              handleProcessDroppedPaths(droppedPaths);
            }
          }
        });
      } catch (err) {
        console.warn("Failed to attach Tauri drag-drop listener:", err);
      }
    };

    setupDragDrop();

    return () => {
      if (unlistenFn) {
        unlistenFn();
      }
    };
  }, [handleProcessDroppedPaths]);

  // Handle CLI initial files and Single Instance open-files event
  useEffect(() => {
    // 1. Initial files on cold start (double-click when app is closed)
    invoke<string[]>("get_initial_files")
      .then((paths) => {
        if (paths && paths.length > 0) {
          handleProcessDroppedPaths(paths);
        }
      })
      .catch((err) => {
        console.warn("Failed to get initial files:", err);
      });

    // 2. Single instance open-files event (double-click when app is already running)
    let unlistenOpenFiles: (() => void) | null = null;
    listen<string[]>("open-files", (event) => {
      if (event.payload && event.payload.length > 0) {
        handleProcessDroppedPaths(event.payload);
      }
    })
      .then((unlisten) => {
        unlistenOpenFiles = unlisten;
      })
      .catch((err) => {
        console.warn("Failed to listen for open-files event:", err);
      });

    return () => {
      if (unlistenOpenFiles) {
        unlistenOpenFiles();
      }
    };
  }, [handleProcessDroppedPaths]);

  // Global Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in input
      if ((e.target as HTMLElement).tagName === "INPUT") return;

      switch (e.code) {
        case "Space":
          e.preventDefault();
          togglePlay();
          resetIdleTimer();
          break;
        case "ArrowLeft":
          e.preventDefault();
          handleSkipTime(-5);
          resetIdleTimer();
          break;
        case "ArrowRight":
          e.preventDefault();
          handleSkipTime(5);
          resetIdleTimer();
          break;
        case "ArrowUp":
          e.preventDefault();
          adjustVolume(0.05);
          resetIdleTimer();
          break;
        case "ArrowDown":
          e.preventDefault();
          adjustVolume(-0.05);
          resetIdleTimer();
          break;
        case "KeyM":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            toggleCompactMode();
          } else {
            toggleMute();
          }
          resetIdleTimer();
          break;
        case "KeyF":
          toggleFullscreen();
          break;
        case "KeyL":
          if (!isFullscreen) {
            setIsPlaylistOpen((prev) => !prev);
          }
          break;
        case "KeyN":
          playNext();
          resetIdleTimer();
          break;
        case "KeyP":
          playPrev();
          resetIdleTimer();
          break;
        case "KeyR":
          cycleRepeatMode();
          resetIdleTimer();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    togglePlay,
    handleSkipTime,
    adjustVolume,
    toggleMute,
    toggleFullscreen,
    playNext,
    playPrev,
    cycleRepeatMode,
    isFullscreen,
    toggleCompactMode,
    resetIdleTimer,
  ]);

  // Helper to handle standard and WebM infinity duration
  const updateMediaDuration = useCallback((target: HTMLMediaElement) => {
    if (Number.isFinite(target.duration) && target.duration > 0) {
      setDuration(target.duration);
    } else if (target.duration === Infinity) {
      // WebM duration workaround
      const onTempTimeUpdate = () => {
        target.removeEventListener("timeupdate", onTempTimeUpdate);
        if (Number.isFinite(target.duration) && target.duration > 0) {
          setDuration(target.duration);
        }
        target.currentTime = 0;
      };
      target.addEventListener("timeupdate", onTempTimeUpdate);
      target.currentTime = 1e101;
    }
  }, []);

  // Media Event handlers
  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLMediaElement>) => {
    const target = e.currentTarget;
    setCurrentTime(target.currentTime);
    if (!Number.isFinite(duration) || duration <= 0) {
      updateMediaDuration(target);
    }
  };

  const handleLoadedMetadata = (e: React.SyntheticEvent<HTMLMediaElement>) => {
    const target = e.currentTarget;
    updateMediaDuration(target);
    if (isPlaying) {
      target.play().catch(console.error);
    }
  };

  const handleDurationChange = (e: React.SyntheticEvent<HTMLMediaElement>) => {
    updateMediaDuration(e.currentTarget);
  };

  const handleEnded = () => {
    playNext();
  };

  // Mouse wheel volume control
  const handleViewerWheel = (e: React.WheelEvent) => {
    if (e.deltaY < 0) {
      adjustVolume(0.05);
    } else {
      adjustVolume(-0.05);
    }
    resetIdleTimer();
  };

  // Video click/double-click handling
  const handleVideoClick = () => {
    if (clickTimerRef.current) {
      window.clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
      // Double click => Toggle fullscreen
      toggleFullscreen();
    } else {
      clickTimerRef.current = window.setTimeout(() => {
        clickTimerRef.current = null;
        // Single click => Toggle play/pause
        togglePlay();
      }, 250);
    }
    resetIdleTimer();
  };

  // Convert current path to Tauri asset URL
  const mediaSrc = currentTrack ? convertFileSrc(currentTrack.path) : "";

  return (
    <div
      ref={appContainerRef}
      className={`app-container ${isFullscreen ? "is-fullscreen" : ""} ${
        isCompact ? "is-compact" : ""
      } ${hideControls ? "hide-controls" : ""}`}
      onMouseMove={handleMouseMove}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onDragEnter={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingFiles(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.currentTarget === e.target) {
          setIsDraggingFiles(false);
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingFiles(false);
      }}
    >
      {/* Compact Mode Mini Top Bar */}
      {isCompact && (
        <div className="compact-top-bar" data-tauri-drag-region>
          <div className="compact-drag-title" data-tauri-drag-region>
            <img src={appIcon} alt="" className="compact-mini-icon" data-tauri-drag-region />
            <span className="compact-title-text" data-tauri-drag-region>
              {currentTrack ? currentTrack.name : "MHMedia"}
            </span>
          </div>
          <div className="compact-top-actions">
            <button
              className="compact-action-btn"
              title="Restore standard view (Ctrl+M)"
              onClick={toggleCompactMode}
            >
              <Maximize2 size={13} />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      {!isFullscreen && !isCompact && (
        <header className="app-header">
          <div className="brand">
            <img src={appIcon} alt="MHMedia" className="brand-icon-img" />
            <span className="brand-title">MHMedia</span>
            <span className="brand-badge">Player</span>
          </div>

          <div className="header-actions">
            <button
              className="btn btn-secondary"
              title="Compact Mode / Mini Player (Ctrl+M)"
              onClick={toggleCompactMode}
            >
              <Minimize2 size={15} /> Compact
            </button>
            <button
              className="btn btn-secondary"
              title="Smart Media Assistant (STT / Lyrics / Subtitles)"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenSmartModal();
              }}
            >
              <Sparkles size={15} color="#818cf8" /> Smart Assistant
            </button>
          <button className="btn btn-secondary" onClick={handleOpenFolder}>
            <FolderOpen size={15} /> Open Folder
          </button>
          <button className="btn btn-primary" onClick={handleOpenFile}>
            <FilePlus size={15} /> Open Media
          </button>
          <div className="hamburger-menu-wrapper" ref={mainMenuRef}>
            <button
              className={`btn-icon-only hamburger-btn ${isMainMenuOpen ? "active" : ""}`}
              title="Menu (About, Open Source, Help, License & Update)"
              onClick={() => setIsMainMenuOpen((prev) => !prev)}
            >
              <Menu size={18} />
            </button>

            {isMainMenuOpen && (
              <div className="hamburger-dropdown-menu">
                <button
                  className="hamburger-menu-item"
                  onClick={() => {
                    setIsMainMenuOpen(false);
                    setIsAboutOpen(true);
                  }}
                >
                  <Info size={16} />
                  <span className="menu-text">About</span>
                </button>

                <button
                  className="hamburger-menu-item"
                  onClick={() => {
                    setIsMainMenuOpen(false);
                    setIsLicensesOpen(true);
                  }}
                >
                  <BookOpen size={16} />
                  <span className="menu-text">Open Source</span>
                </button>

                <button
                  className="hamburger-menu-item"
                  onClick={() => {
                    setIsMainMenuOpen(false);
                    setIsShortcutsOpen(true);
                  }}
                >
                  <HelpCircle size={16} />
                  <span className="menu-text">Help</span>
                  <span className="menu-shortcut">?</span>
                </button>

                <div className="hamburger-menu-divider" />

                <button
                  className="hamburger-menu-item"
                  onClick={() => {
                    setIsMainMenuOpen(false);
                    setIsLicenseUpdateOpen(true);
                  }}
                >
                  <ShieldCheck size={16} />
                  <span className="menu-text">License & Update</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      )}

      {/* Main Workspace */}
      <main className="app-main">
        {/* Viewer Section */}
        <section
          className="viewer-section"
          onWheel={handleViewerWheel}
        >
          {!currentTrack ? (
            <div className="empty-state">
              <div className="empty-icon-halo">
                <PlayCircle size={44} />
              </div>
              <h2 className="empty-title">Please select a media file</h2>
              <p className="empty-desc">
                Open high-quality audio (MP3, WAV, FLAC) or video (MP4, WebM, MKV)
                files to start enjoying.
              </p>
              <div className="empty-actions">
                <button className="btn btn-primary" onClick={handleOpenFile}>
                  <FilePlus size={16} /> Open Files
                </button>
                <button className="btn btn-secondary" onClick={handleOpenFolder}>
                  <FolderOpen size={16} /> Open Folder
                </button>
              </div>
            </div>
          ) : currentTrack.mediaType === "video" ? (
            <div className="video-wrapper" onClick={handleVideoClick}>
              <video
                ref={videoRef}
                key={currentTrack.path}
                src={mediaSrc}
                className="video-element"
                autoPlay={isPlaying}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onDurationChange={handleDurationChange}
                onCanPlay={(e) => updateMediaDuration(e.currentTarget)}
                onEnded={handleEnded}
              />
            </div>
          ) : (
            <div
              className="audio-wrapper"
              onClick={handleVideoClick}
            >
              <audio
                ref={audioRef}
                key={currentTrack.path}
                src={mediaSrc}
                autoPlay={isPlaying}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onDurationChange={handleDurationChange}
                onCanPlay={(e) => updateMediaDuration(e.currentTarget)}
                onEnded={handleEnded}
              />
              <div
                className="audio-centerpiece"
                onClick={(e) => e.stopPropagation()}
              >
                <div className={`disc-art ${isPlaying ? "playing" : ""}`}>
                  <div className="disc-inner-ring">
                    <Music size={22} />
                  </div>
                </div>
                <h2 className="audio-title" title={currentTrack.name}>
                  {currentTrack.name}
                </h2>
                <div className="audio-meta">
                  <span className="tag-badge">{currentTrack.extension}</span>
                  <span>Audio Playing</span>
                </div>

                <AudioVisualizer isPlaying={isPlaying} audioRef={audioRef} />
              </div>
            </div>
          )}

          {/* On-Screen Display Overlay */}
          {osd && (
            <div className="osd-overlay">
              {osd.icon}
              <span className="osd-text">{osd.text}</span>
            </div>
          )}
        </section>

        {/* Playlist Sidebar */}
        <Playlist
          items={playlist}
          currentIndex={currentIndex}
          isOpen={isPlaylistOpen && !isFullscreen}
          onSelectTrack={handleSelectTrack}
          onRemoveTrack={handleRemoveTrack}
          onClearPlaylist={handleClearPlaylist}
          onOpenFile={handleOpenFile}
          onOpenFolder={handleOpenFolder}
          onClose={() => setIsPlaylistOpen(false)}
        />
      </main>

      {/* Bottom Controls Bar (Translucent Overlay in Fullscreen) */}
      <div
        className="player-controls-wrapper"
        onMouseEnter={() => {
          isHoveringControlsRef.current = true;
          setHideControls(false);
        }}
        onMouseLeave={() => {
          isHoveringControlsRef.current = false;
          resetIdleTimer();
        }}
      >
        <PlayerControls
          currentTrack={currentTrack}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          volume={volume}
          isMuted={isMuted}
          playbackRate={playbackRate}
          repeatMode={repeatMode}
          isShuffle={isShuffle}
          isPlaylistOpen={isPlaylistOpen}
          isCompact={isCompact}
          onToggleCompact={toggleCompactMode}
          onTogglePlay={togglePlay}
          onSeek={handleSeek}
          onPrev={playPrev}
          onNext={playNext}
          onSkipTime={handleSkipTime}
          onChangeVolume={(v) => {
            setVolume(v);
            setIsMuted(false);
          }}
          onToggleMute={toggleMute}
          onChangeRate={cyclePlaybackRate}
          onToggleRepeat={cycleRepeatMode}
          onToggleShuffle={() => setIsShuffle((prev) => !prev)}
          onToggleFullscreen={toggleFullscreen}
          onTogglePlaylist={() => setIsPlaylistOpen((prev) => !prev)}
          onOpenShortcuts={() => setIsShortcutsOpen(true)}
        />
      </div>

      {/* Smart Assistant Modal */}
      <SmartAssistantModal
        isOpen={isSmartModalOpen}
        onClose={() => setIsSmartModalOpen(false)}
        currentTrack={currentTrack}
        currentTime={currentTime}
        duration={duration}
        isPlaying={isPlaying}
        onTogglePlay={togglePlay}
        onSeek={handleSeek}
        defaultTab={smartModalTab}
      />

      {/* Shortcuts Modal (Help) */}
      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      {/* About Dialog */}
      <AboutDialog
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
      />

      {/* Open Source Licenses Dialog */}
      <OpenLicenseDialog
        isOpen={isLicensesOpen}
        onClose={() => setIsLicensesOpen(false)}
      />

      {/* License & Update Dialog */}
      <LicenseAndUpdateDialog
        isOpen={isLicenseUpdateOpen}
        onClose={() => setIsLicenseUpdateOpen(false)}
      />

      {/* Drag & Drop Visual Overlay */}
      {isDraggingFiles && (
        <div className="drag-drop-overlay">
          <div className="drag-drop-content">
            <div className="drag-icon-halo">
              <UploadCloud size={52} className="drag-icon-anim" />
            </div>
            <h2 className="drag-drop-title">Drop Files or Folders Here</h2>
            <p className="drag-drop-subtitle">
              Drop media files or folders to add them to your playlist instantly
            </p>
            <div className="drag-supported-tags">
              <span>MP3</span>
              <span>WAV</span>
              <span>FLAC</span>
              <span>MP4</span>
              <span>WEBM</span>
              <span>MKV</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
