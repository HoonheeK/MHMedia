import React, { useRef, useState, useEffect, useCallback } from "react";
import { MediaItem, RepeatMode } from "../types/media";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  RotateCw,
  Repeat,
  Repeat1,
  Shuffle,
  Volume2,
  Volume1,
  VolumeX,
  Maximize2,
  ListMusic,
  Keyboard,
  Music,
  Film,
} from "lucide-react";

interface PlayerControlsProps {
  currentTrack: MediaItem | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  playbackRate: number;
  repeatMode: RepeatMode;
  isShuffle: boolean;
  isPlaylistOpen: boolean;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onPrev: () => void;
  onNext: () => void;
  onSkipTime: (offset: number) => void;
  onChangeVolume: (vol: number) => void;
  onToggleMute: () => void;
  onChangeRate: () => void;
  onToggleRepeat: () => void;
  onToggleShuffle: () => void;
  onToggleFullscreen: () => void;
  onTogglePlaylist: () => void;
  onOpenShortcuts: () => void;
}

export const PlayerControls: React.FC<PlayerControlsProps> = ({
  currentTrack,
  isPlaying,
  currentTime,
  duration,
  volume,
  isMuted,
  playbackRate,
  repeatMode,
  isShuffle,
  isPlaylistOpen,
  onTogglePlay,
  onSeek,
  onPrev,
  onNext,
  onSkipTime,
  onChangeVolume,
  onToggleMute,
  onChangeRate,
  onToggleRepeat,
  onToggleShuffle,
  onToggleFullscreen,
  onTogglePlaylist,
  onOpenShortcuts,
}) => {
  const seekbarRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragProgress, setDragProgress] = useState(0);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState<number>(0);

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0 || !isFinite(seconds)) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Calculate seek position from mouse clientX
  const getSeekTimeFromEvent = useCallback(
    (clientX: number): number | null => {
      if (!seekbarRef.current) return null;
      const rect = seekbarRef.current.getBoundingClientRect();
      const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const validDuration = Number.isFinite(duration) && duration > 0 ? duration : 0;
      return pos * validDuration;
    },
    [duration]
  );

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!Number.isFinite(duration) || duration <= 0) return;
    setIsDragging(true);

    const time = getSeekTimeFromEvent(e.clientX);
    if (time !== null) {
      setDragProgress((time / duration) * 100);
      onSeek(time);
    }
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const time = getSeekTimeFromEvent(e.clientX);
      if (time !== null && duration > 0) {
        setDragProgress((time / duration) * 100);
        onSeek(time);
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      setIsDragging(false);
      const time = getSeekTimeFromEvent(e.clientX);
      if (time !== null) {
        onSeek(time);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, duration, getSeekTimeFromEvent, onSeek]);

  // Hover time preview
  const handleMouseMoveSeekbar = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!seekbarRef.current || !Number.isFinite(duration) || duration <= 0) return;
    const rect = seekbarRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const ratio = x / rect.width;
    setHoverTime(ratio * duration);
    setHoverX(x);
  };

  const handleMouseLeaveSeekbar = () => {
    setHoverTime(null);
  };

  const validDuration = Number.isFinite(duration) && duration > 0 ? duration : 0;
  const progressPercent = isDragging
    ? dragProgress
    : validDuration > 0
    ? (currentTime / validDuration) * 100
    : 0;

  return (
    <div className="player-bar">
      {/* Timeline Seekbar */}
      <div className="timeline-container">
        <span className="time-label current">{formatTime(currentTime)}</span>

        <div
          ref={seekbarRef}
          className="seekbar-wrapper"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMoveSeekbar}
          onMouseLeave={handleMouseLeaveSeekbar}
        >
          <div className="seekbar">
            <div
              className="seekbar-progress"
              style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
            >
              <div className="seekbar-handle" />
            </div>
          </div>

          {/* Hover Time Tooltip */}
          {hoverTime !== null && (
            <div
              className="seekbar-tooltip"
              style={{ left: `${hoverX}px` }}
            >
              {formatTime(hoverTime)}
            </div>
          )}
        </div>

        <span className="time-label">{formatTime(validDuration)}</span>
      </div>

      {/* Main Controls Row */}
      <div className="controls-row">
        {/* Left: Track Information */}
        <div className="left-info">
          {currentTrack ? (
            <>
              <div className="info-thumb">
                {currentTrack.mediaType === "video" ? (
                  <Film size={20} />
                ) : (
                  <Music size={20} />
                )}
              </div>
              <div className="info-meta">
                <span className="info-title" title={currentTrack.name}>
                  {currentTrack.name}
                </span>
                <span className="info-type">
                  {currentTrack.extension.toUpperCase()} ·{" "}
                  {currentTrack.mediaType === "video" ? "Video" : "Audio"}
                </span>
              </div>
            </>
          ) : (
            <div className="info-meta">
              <span className="info-title" style={{ color: "var(--text-muted)" }}>
                No media playing
              </span>
            </div>
          )}
        </div>

        {/* Center: Playback Buttons */}
        <div className="center-buttons">
          <button
            className={`btn-icon-only ${isShuffle ? "active" : ""}`}
            title={`Shuffle: ${isShuffle ? "On" : "Off"}`}
            onClick={onToggleShuffle}
          >
            <Shuffle size={16} />
          </button>

          <button
            className="btn-icon-only"
            title="Previous track (P)"
            onClick={onPrev}
            disabled={!currentTrack}
          >
            <SkipBack size={18} />
          </button>

          <button
            className="btn-icon-only"
            title="5s backward (←)"
            onClick={() => onSkipTime(-5)}
            disabled={!currentTrack}
          >
            <RotateCcw size={17} />
          </button>

          <button
            className="btn-play-pause"
            title={isPlaying ? "Pause (Space)" : "Play (Space)"}
            onClick={onTogglePlay}
            disabled={!currentTrack}
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} style={{ marginLeft: 2 }} />}
          </button>

          <button
            className="btn-icon-only"
            title="5s forward (→)"
            onClick={() => onSkipTime(5)}
            disabled={!currentTrack}
          >
            <RotateCw size={17} />
          </button>

          <button
            className="btn-icon-only"
            title="Next track (N)"
            onClick={onNext}
            disabled={!currentTrack}
          >
            <SkipForward size={18} />
          </button>

          <button
            className={`btn-icon-only ${repeatMode !== "off" ? "active" : ""}`}
            title={`Repeat: ${repeatMode === "all" ? "All" : repeatMode === "one" ? "One" : "Off"}`}
            onClick={onToggleRepeat}
          >
            {repeatMode === "one" ? <Repeat1 size={17} /> : <Repeat size={17} />}
          </button>
        </div>

        {/* Right: Extra controls */}
        <div className="right-features">
          <button
            className="speed-badge"
            title="Playback speed"
            onClick={onChangeRate}
          >
            {playbackRate}x
          </button>

          <div className="volume-control">
            <button
              className="btn-icon-only"
              onClick={onToggleMute}
              title={isMuted ? "Unmute (M)" : "Mute (M)"}
            >
              {isMuted || volume === 0 ? (
                <VolumeX size={17} />
              ) : volume < 0.5 ? (
                <Volume1 size={17} />
              ) : (
                <Volume2 size={17} />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={(e) => onChangeVolume(parseFloat(e.target.value))}
              className="volume-slider"
              title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
            />
          </div>

          {currentTrack?.mediaType === "video" && (
            <button
              className="btn-icon-only"
              title="Fullscreen (F)"
              onClick={onToggleFullscreen}
            >
              <Maximize2 size={16} />
            </button>
          )}

          <button
            className={`btn-icon-only ${isPlaylistOpen ? "active" : ""}`}
            title="Toggle playlist (L)"
            onClick={onTogglePlaylist}
          >
            <ListMusic size={17} />
          </button>

          <button
            className="btn-icon-only"
            title="Keyboard shortcuts"
            onClick={onOpenShortcuts}
          >
            <Keyboard size={17} />
          </button>
        </div>
      </div>
    </div>
  );
};
