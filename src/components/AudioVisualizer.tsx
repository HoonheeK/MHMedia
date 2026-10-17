import React, { useEffect, useRef } from "react";

interface AudioVisualizerProps {
  isPlaying: boolean;
  audioRef: React.RefObject<HTMLAudioElement | null>;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ isPlaying, audioRef }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);

  useEffect(() => {
    // Canvas setup
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Web Audio setup if feasible
    if (audioRef.current && !audioContextRef.current) {
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const audioCtx = new AudioCtx();
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 128;
        
        const source = audioCtx.createMediaElementSource(audioRef.current);
        source.connect(analyser);
        analyser.connect(audioCtx.destination);

        audioContextRef.current = audioCtx;
        analyserRef.current = analyser;
        sourceNodeRef.current = source;
      } catch (err) {
        // Fallback to simulated audio visualization if AudioContext is blocked by browser security
        console.warn("Web Audio API direct connect skipped or fallback:", err);
      }
    }

    if (audioContextRef.current && audioContextRef.current.state === "suspended" && isPlaying) {
      audioContextRef.current.resume().catch(() => {});
    }

    let phase = 0;
    const bufferLength = analyserRef.current ? analyserRef.current.frequencyBinCount : 48;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      phase += 0.05;
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      let hasRealData = false;
      if (analyserRef.current && isPlaying) {
        analyserRef.current.getByteFrequencyData(dataArray);
        hasRealData = dataArray.some((val) => val > 0);
      }

      const barCount = 48;
      const barSpacing = 4;
      const totalSpacing = barSpacing * (barCount - 1);
      const barWidth = Math.max(3, (width - totalSpacing) / barCount);

      for (let i = 0; i < barCount; i++) {
        let value = 4;
        if (isPlaying) {
          if (hasRealData) {
            const dataIndex = Math.floor((i / barCount) * (dataArray.length / 2));
            value = Math.max(4, (dataArray[dataIndex] / 255) * height * 0.9);
          } else {
            // Simulated rhythmic pulse
            const sin1 = Math.sin(phase + i * 0.2);
            const sin2 = Math.cos(phase * 1.5 + i * 0.3);
            const norm = (sin1 + sin2 + 2) / 4;
            value = Math.max(6, norm * (height * 0.75) * (0.6 + 0.4 * Math.sin(i * 0.1)));
          }
        }

        const x = i * (barWidth + barSpacing);
        const y = height - value;

        // Gradient for each bar
        const gradient = ctx.createLinearGradient(0, height, 0, 0);
        gradient.addColorStop(0, "#4f46e5");
        gradient.addColorStop(0.5, "#6366f1");
        gradient.addColorStop(1, "#06b6d4");

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, value, [4, 4, 0, 0]);
        ctx.fill();
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, audioRef]);

  return (
    <div className="audio-canvas-container">
      <canvas ref={canvasRef} width={680} height={120} className="visualizer-canvas" />
    </div>
  );
};
