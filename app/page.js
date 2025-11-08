"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { toBlobURL, fetchFile } from "@ffmpeg/util";

const WIDTH = 720; // Portrait HD for Instagram
const HEIGHT = 1280;
const FPS = 24;
const DURATION_SECONDS = 5; // Short reel
const FRAME_COUNT = FPS * DURATION_SECONDS;

export default function Home() {
  const [isLoadingCore, setIsLoadingCore] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [percent, setPercent] = useState(0);
  const [videoUrl, setVideoUrl] = useState("");
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState("");

  const ffmpegRef = useRef(null);
  const baseURL = useMemo(() => "https://unpkg.com/@ffmpeg/core@0.12.7/dist/umd", []);

  useEffect(() => {
    const ffmpeg = new FFmpeg();
    ffmpegRef.current = ffmpeg;
    ffmpeg.on("log", ({ message }) => {
      setLogs((prev) => (prev.length > 200 ? prev.slice(-200) : prev).concat(message));
    });
  }, []);

  const ensureCoreLoaded = useCallback(async () => {
    if (!ffmpegRef.current) throw new Error("FFmpeg not initialized");
    if (ffmpegRef.current.loaded) return;
    setIsLoadingCore(true);
    try {
      const coreURL = await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript");
      const wasmURL = await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm");
      const workerURL = await toBlobURL(`${baseURL}/ffmpeg-core.worker.js`, "text/javascript");
      await ffmpegRef.current.load({ coreURL, wasmURL, workerURL });
    } finally {
      setIsLoadingCore(false);
    }
  }, [baseURL]);

  const drawFrame = useCallback((ctx, frameIndex) => {
    const t = frameIndex / FPS; // seconds
    // Background gradient
    const g = ctx.createLinearGradient(0, 0, 0, HEIGHT);
    g.addColorStop(0, "#0a0f1f");
    g.addColorStop(1, "#020409");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Subtle grid
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.strokeStyle = "#1c2a4a";
    ctx.lineWidth = 1;
    const gridSize = 32;
    for (let x = 0; x < WIDTH; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y < HEIGHT; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(WIDTH, y);
      ctx.stroke();
    }
    ctx.restore();

    // Animated globe
    const cx = WIDTH / 2;
    const cy = HEIGHT * 0.48;
    const r = Math.min(WIDTH, HEIGHT) * 0.32;
    const rotation = t * Math.PI * 0.8; // slow rotate

    // Outer glow
    ctx.save();
    const glow = ctx.createRadialGradient(cx, cy, r * 0.4, cx, cy, r * 1.1);
    glow.addColorStop(0, "rgba(14, 165, 233, 0.1)");
    glow.addColorStop(1, "rgba(14, 165, 233, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Sphere base
    ctx.save();
    ctx.strokeStyle = "#0ea5e9";
    ctx.lineWidth = 2;
    ctx.shadowColor = "#06b6d4";
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Lat/Lon lines
    ctx.save();
    ctx.strokeStyle = "rgba(56, 189, 248, 0.7)";
    ctx.lineWidth = 1.2;
    const latLines = 8;
    const lonLines = 14;
    // Latitude (horizontal)
    for (let i = 1; i < latLines; i++) {
      const lat = (i / latLines) * Math.PI - Math.PI / 2;
      const ry = r * Math.cos(lat);
      const y = cy + r * Math.sin(lat);
      ctx.beginPath();
      ctx.ellipse(cx, y, r, Math.max(ry, 0), 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Longitude (vertical) with rotation
    for (let j = 0; j < lonLines; j++) {
      const lon = (j / lonLines) * Math.PI * 2 + rotation;
      const cos = Math.cos(lon);
      ctx.beginPath();
      for (let k = -r; k <= r; k += 2) {
        const y = cy + k;
        const x = cx + Math.sqrt(Math.max(0, r * r - k * k)) * cos;
        if (k === -r) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();

    // Orbiting nodes
    ctx.save();
    const nodes = 90;
    for (let n = 0; n < nodes; n++) {
      const a = (n / nodes) * Math.PI * 2 + rotation * 1.6;
      const rr = r * (0.85 + 0.1 * Math.sin(n * 0.7 + t * 2));
      const x = cx + rr * Math.cos(a);
      const y = cy + rr * Math.sin(a) * 0.6;
      const size = 2 + 1.5 * Math.sin(a * 3 + t * 5);
      ctx.fillStyle = "#22d3ee";
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Radiating circuit lines
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.strokeStyle = "#60a5fa";
    for (let i = 0; i < 30; i++) {
      const ang = (i / 30) * Math.PI * 2 + rotation * 0.5;
      const x1 = cx + r * Math.cos(ang);
      const y1 = cy + r * Math.sin(ang);
      const x2 = cx + (r + 120 + 40 * Math.sin(t * 2 + i)) * Math.cos(ang);
      const y2 = cy + (r + 120 + 40 * Math.sin(t * 2 + i)) * Math.sin(ang);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    ctx.restore();

    // Title
    ctx.save();
    ctx.textAlign = "center";
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "800 54px system-ui, -apple-system, Segoe UI, Roboto";
    ctx.fillText("AI COVERS THE WORLD", WIDTH / 2, HEIGHT * 0.1);
    ctx.font = "600 22px system-ui, -apple-system, Segoe UI, Roboto";
    ctx.fillStyle = "#93c5fd";
    ctx.fillText("Instagram Reel ? 720?1280 ? 5s ? 24fps", WIDTH / 2, HEIGHT * 0.14);
    ctx.restore();

    // Footer callout
    ctx.save();
    ctx.globalAlpha = 0.8;
    ctx.textAlign = "center";
    ctx.font = "700 26px system-ui, -apple-system, Segoe UI, Roboto";
    const pulse = 0.5 + 0.5 * Math.sin(t * 6);
    ctx.fillStyle = `rgba(34, 211, 238, ${0.6 + pulse * 0.3})`;
    ctx.fillText("The AI era is global.", WIDTH / 2, HEIGHT * 0.9);
    ctx.restore();
  }, []);

  const generate = useCallback(async () => {
    setError("");
    setVideoUrl("");
    setPercent(0);
    setIsGenerating(true);
    try {
      await ensureCoreLoaded();
      const ffmpeg = ffmpegRef.current;

      // Prepare canvas
      const canvas = document.createElement("canvas");
      canvas.width = WIDTH;
      canvas.height = HEIGHT;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas 2D context not available");

      // Render frames and write to ffmpeg FS
      for (let i = 0; i < FRAME_COUNT; i++) {
        drawFrame(ctx, i);
        const dataUrl = canvas.toDataURL("image/png");
        const file = await fetchFile(dataUrl);
        const name = `frame${String(i + 1).padStart(4, "0")}.png`;
        await ffmpeg.writeFile(name, file);
        setPercent(Math.round(((i + 1) / FRAME_COUNT) * 40)); // 0-40% during rendering
        if (i % 12 === 0) await new Promise((r) => setTimeout(r, 0));
      }

      // Encode to MP4 (H.264, yuv420p for Instagram compatibility)
      await ffmpeg.exec([
        "-r",
        String(FPS),
        "-f",
        "image2",
        "-i",
        "frame%04d.png",
        "-vcodec",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-preset",
        "veryfast",
        "-crf",
        "23",
        "-movflags",
        "+faststart",
        "output.mp4",
      ]);
      setPercent(85);

      const mp4Data = await ffmpeg.readFile("output.mp4");
      const blob = new Blob([mp4Data.buffer], { type: "video/mp4" });
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
      setPercent(100);

      // Cleanup frames to free memory
      for (let i = 0; i < FRAME_COUNT; i++) {
        const name = `frame${String(i + 1).padStart(4, "0")}.png`;
        try { await ffmpeg.deleteFile(name); } catch {}
      }
      try { await ffmpeg.deleteFile("output.mp4"); } catch {}
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setIsGenerating(false);
    }
  }, [ensureCoreLoaded, drawFrame]);

  return (
    <div className="container">
      <div className="header">
        <div>
          <div className="h1">AI Cover The World ? Reel Generator</div>
          <div className="sub">Client-side rendering with ffmpeg.wasm ? No upload required</div>
        </div>
        <a className="badge" href="https://vercel.com" target="_blank" rel="noreferrer">Deployed on Vercel</a>
      </div>

      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="controls" style={{ marginBottom: 16 }}>
          <button className="btn" disabled={isGenerating || isLoadingCore} onClick={generate}>
            {isLoadingCore ? "Loading video engine?" : isGenerating ? "Generating?" : "Generate 5s Reel (MP4)"}
          </button>
          <div>
            <div className="progress" aria-label="progress">
              <div className="progressBar" style={{ width: `${percent}%` }} />
            </div>
            <div className="small" style={{ marginTop: 8 }}>{percent}%</div>
          </div>
        </div>
        {error ? (
          <div style={{ color: "#fda4af", fontWeight: 700 }}>Error: {error}</div>
        ) : null}
        <div className="canvasWrap">
          <div className="canvasBox">
            <PreviewCanvas />
          </div>
          <div>
            <div className="note">Tip: After generation, use the download link and upload directly to Instagram. The output is 720?1280 at 24fps with H.264/yuv420p for compatibility.</div>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="preview">
          <div className="badge">Output</div>
          {videoUrl ? (
            <>
              <video src={videoUrl} controls width={270} height={480} style={{ borderRadius: 12, border: "1px solid #1B2233" }} />
              <a className="link" href={videoUrl} download="ai-covers-world.mp4">Download MP4</a>
            </>
          ) : (
            <div className="small">No video generated yet.</div>
          )}
        </div>
        <details style={{ marginTop: 12 }}>
          <summary className="small">Build log</summary>
          <pre style={{ whiteSpace: "pre-wrap", maxHeight: 220, overflow: "auto" }}>
            {logs.join("\n")}
          </pre>
        </details>
      </div>
    </div>
  );
}

function PreviewCanvas() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    canvas.width = WIDTH / 3;
    canvas.height = HEIGHT / 3;
    const ctx = canvas.getContext("2d");
    let raf = 0;
    let frame = 0;
    const draw = () => {
      // simple animated preview placeholder
      const t = (frame++ % FPS) / FPS;
      // Background
      const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
      g.addColorStop(0, "#0a0f1f");
      g.addColorStop(1, "#020409");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const cx = canvas.width / 2;
      const cy = canvas.height * 0.48;
      const r = Math.min(canvas.width, canvas.height) * 0.32;
      // Circle
      ctx.strokeStyle = "#0ea5e9";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      // Dot orbit
      const a = t * Math.PI * 2;
      const x = cx + r * 0.9 * Math.cos(a);
      const y = cy + r * 0.6 * Math.sin(a);
      ctx.fillStyle = "#22d3ee";
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
      // Title
      ctx.fillStyle = "#e2e8f0";
      ctx.font = "bold 14px system-ui";
      ctx.textAlign = "center";
      ctx.fillText("AI COVERS THE WORLD", cx, canvas.height * 0.12);
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} aria-label="preview" />;
}
