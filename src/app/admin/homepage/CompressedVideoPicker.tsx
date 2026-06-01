"use client";

import { useRef, useState } from "react";
import { uploadOne } from "@/app/_components/blobUpload";

// NOTE: placeholder compression pipeline.
// ffmpeg.wasm runs in the browser and handles short hero loops fine,
// but it's slow (10–60s per video) and memory-bound — fine for a CMS
// "set it once and forget" video, brutal for high-volume video upload.
// When we're ready, swap this out for a dedicated video service
// (Mux, Cloudflare Stream, Bunny Stream) that handles transcoding,
// poster extraction, and adaptive playback server-side.

// Single-threaded UMD core from the CDN — no SharedArrayBuffer required,
// so we don't need COOP / COEP headers on the app. ~30 MB total wasm +
// js, cached by the browser after first download.
const FFMPEG_CORE_VERSION = "0.12.10";
const FFMPEG_CORE_BASE = `https://unpkg.com/@ffmpeg/core@${FFMPEG_CORE_VERSION}/dist/umd`;

type Phase =
  | "idle"
  | "loading"
  | "compressing"
  | "extracting"
  | "uploading-video"
  | "uploading-poster"
  // Fallback path: skip ffmpeg, upload the file directly via client-direct
  // Blob upload. Use this when compression fails or when the agent has a
  // pre-compressed file in hand.
  | "uploading-direct"
  | "error";

type Props = {
  videoUrl: string;
  onVideoChange: (url: string) => void;
  // After compression we also extract the first frame. Setter is required
  // so the picker can wire the auto-poster into the same form state.
  onPosterChange: (url: string) => void;
  disabled?: boolean;
};

export default function CompressedVideoPicker({
  videoUrl,
  onVideoChange,
  onPosterChange,
  disabled,
}: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  // Separate hidden input for the no-compression fallback so we can
  // re-trigger it from the error banner without clobbering the compress
  // input's onChange handler.
  const directInputRef = useRef<HTMLInputElement | null>(null);

  const busy = phase !== "idle" && phase !== "error";

  // Fallback path — upload exactly what the agent selected, no ffmpeg.
  // The poster has to be set manually via the picker below in this case
  // because we never get the frame data into memory.
  async function onPickDirect(file: File | undefined) {
    if (!file) return;
    setError(null);
    setPhase("uploading-direct");
    setStatusMsg("Uploading video as-is (no compression)…");
    setProgress(0);
    try {
      const url = await uploadOne(file, "home/hero");
      onVideoChange(url);
      setPhase("idle");
      setStatusMsg("");
    } catch (e) {
      console.error("Direct video upload failed", e);
      setPhase("error");
      setError(e instanceof Error ? e.message : "Upload failed");
    }
  }

  async function onPick(file: File | undefined) {
    if (!file) return;
    setError(null);

    try {
      // Dynamic imports — ffmpeg.wasm wrapper code isn't bundled into the
      // admin chunk. It's only fetched when an agent actually picks a file.
      setPhase("loading");
      setStatusMsg("Loading video compressor (≈30 MB, one-time)…");
      setProgress(0);

      const [{ FFmpeg }, { toBlobURL, fetchFile }] = await Promise.all([
        import("@ffmpeg/ffmpeg"),
        import("@ffmpeg/util"),
      ]);
      const ffmpeg = new FFmpeg();

      await ffmpeg.load({
        coreURL: await toBlobURL(
          `${FFMPEG_CORE_BASE}/ffmpeg-core.js`,
          "text/javascript",
        ),
        wasmURL: await toBlobURL(
          `${FFMPEG_CORE_BASE}/ffmpeg-core.wasm`,
          "application/wasm",
        ),
      });

      // ── Compress ───────────────────────────────────────────
      setPhase("compressing");
      setStatusMsg(
        "Compressing video (this can take 10–60 seconds, please don't close the tab)…",
      );
      setProgress(0);

      // ffmpeg.wasm emits progress as 0..1.
      ffmpeg.on("progress", ({ progress: p }) => {
        // p sometimes overshoots toward the end; clamp + cap at 99 so we
        // never look "stuck at 100" between stages.
        const pct = Math.max(0, Math.min(99, Math.round(p * 100)));
        setProgress(pct);
      });

      const inputName = "input" + extensionFor(file);
      await ffmpeg.writeFile(inputName, await fetchFile(file));
      // Scale to max 1280 wide, keep aspect ratio, force even height.
      // CRF 28 + medium preset hits ~2–4 MB for a typical 8–15s loop.
      // -an strips audio (it's a muted background). +faststart moves the
      // moov atom to the head so browsers can begin playing while the
      // file is still downloading.
      await ffmpeg.exec([
        "-i",
        inputName,
        "-vf",
        "scale='min(1280,iw)':-2",
        "-c:v",
        "libx264",
        "-preset",
        "medium",
        "-crf",
        "28",
        "-an",
        "-movflags",
        "+faststart",
        "out.mp4",
      ]);
      const compressedData = (await ffmpeg.readFile("out.mp4")) as Uint8Array;
      const videoBlob = toBlob(compressedData, "video/mp4");

      // ── Poster (first frame) ───────────────────────────────
      setPhase("extracting");
      setStatusMsg("Extracting poster image…");
      setProgress(0);

      await ffmpeg.exec([
        "-i",
        "out.mp4",
        "-ss",
        "00:00:00",
        "-vframes",
        "1",
        "-q:v",
        "3",
        "poster.jpg",
      ]);
      const posterData = (await ffmpeg.readFile("poster.jpg")) as Uint8Array;
      const posterBlob = toBlob(posterData, "image/jpeg");

      // Free wasm memory before we kick off uploads.
      try {
        ffmpeg.terminate();
      } catch {
        /* ignore */
      }

      // ── Uploads ────────────────────────────────────────────
      const stamp = Date.now();

      setPhase("uploading-video");
      setStatusMsg("Uploading compressed video…");
      setProgress(0);
      const videoFile = new File(
        [videoBlob],
        `hero-bg-${stamp}.mp4`,
        { type: "video/mp4" },
      );
      const videoUrlResult = await uploadOne(videoFile, "home/hero");

      setPhase("uploading-poster");
      setStatusMsg("Uploading auto-generated poster…");
      setProgress(0);
      const posterFile = new File(
        [posterBlob],
        `hero-poster-${stamp}.jpg`,
        { type: "image/jpeg" },
      );
      const posterUrlResult = await uploadOne(posterFile, "home/hero");

      // Apply both at the end so a failure mid-way leaves the form
      // pointing at the previous state instead of an inconsistent pair.
      onVideoChange(videoUrlResult);
      onPosterChange(posterUrlResult);

      setPhase("idle");
      setStatusMsg("");
      setProgress(0);
    } catch (e) {
      console.error("Hero video compression failed", e);
      setPhase("error");
      setError(e instanceof Error ? e.message : "Compression failed");
    }
  }

  return (
    <div>
      {videoUrl && !busy && (
        <video
          src={videoUrl}
          controls
          style={{
            width: "100%",
            maxWidth: 480,
            borderRadius: 12,
            marginBottom: 10,
            border: "1px solid var(--line)",
          }}
        />
      )}

      {busy && (
        <div style={{ marginBottom: 14 }}>
          <div
            style={{
              fontSize: 13,
              color: "var(--ink-2)",
              fontWeight: 600,
              marginBottom: 8,
            }}
          >
            {statusMsg}
          </div>
          {phase === "compressing" && (
            <ProgressBar pct={progress} label={`${progress}%`} />
          )}
          {phase === "uploading-video" ||
          phase === "uploading-poster" ||
          phase === "uploading-direct" ? (
            <Indeterminate />
          ) : null}
          {phase === "loading" && (
            <>
              <Indeterminate />
              <div
                style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}
              >
                First load only — cached afterwards.
              </div>
            </>
          )}
          {phase === "extracting" && <Indeterminate />}
        </div>
      )}

      {!busy && (
        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          {/* Main path — compress + auto-poster */}
          <label
            style={{
              display: "inline-block",
              padding: "10px 18px",
              border: "1px dashed var(--line)",
              borderRadius: 10,
              cursor: disabled ? "not-allowed" : "pointer",
              opacity: disabled ? 0.5 : 1,
              color: "var(--ink-2)",
              fontSize: 14,
            }}
          >
            {videoUrl ? "Replace video (compress)" : "+ Upload video (compress)"}
            <input
              ref={inputRef}
              type="file"
              accept="video/*"
              disabled={disabled}
              onChange={(e) => onPick(e.target.files?.[0])}
              style={{ display: "none" }}
            />
          </label>

          {/* Always-available fallback — direct upload, no ffmpeg.
              Visually secondary so the compress path stays the default. */}
          <label
            style={{
              display: "inline-block",
              padding: "10px 16px",
              border: "1px solid var(--line)",
              borderRadius: 10,
              cursor: disabled ? "not-allowed" : "pointer",
              opacity: disabled ? 0.5 : 1,
              color: "var(--muted)",
              fontSize: 13,
              background: "var(--white)",
            }}
            title="Skip in-browser compression. Use when compression fails or you already have a small file."
          >
            Upload as-is (no compression)
            <input
              ref={directInputRef}
              type="file"
              accept="video/*"
              disabled={disabled}
              onChange={(e) => onPickDirect(e.target.files?.[0])}
              style={{ display: "none" }}
            />
          </label>

          {videoUrl && (
            <button
              type="button"
              onClick={() => {
                onVideoChange("");
                onPosterChange("");
              }}
              className="pill no"
              style={{ fontSize: 13 }}
            >
              Remove
            </button>
          )}
        </div>
      )}

      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 10 }}>
        <strong>Compress</strong> resizes to 1280px wide / H.264 / no audio in
        your browser (~2–4 MB for a short loop) and auto-generates a poster from
        the first frame. <strong>Upload as-is</strong> skips compression — use it
        when compression fails or you already have a small file; set the poster
        manually below in that case.
      </div>

      {error && (
        <div
          style={{
            marginTop: 10,
            padding: "10px 14px",
            background: "#fbe9e4",
            color: "var(--coral-d)",
            borderRadius: 10,
            fontSize: 13,
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span style={{ flex: 1 }}>{error}</span>
          <button
            type="button"
            onClick={() => {
              setPhase("idle");
              setError(null);
              inputRef.current?.click();
            }}
            className="btn-ghost"
            style={{ fontSize: 12, padding: "4px 12px" }}
          >
            Try compression again
          </button>
          <button
            type="button"
            onClick={() => {
              setPhase("idle");
              setError(null);
              directInputRef.current?.click();
            }}
            className="btn-ghost"
            style={{ fontSize: 12, padding: "4px 12px" }}
          >
            Upload as-is instead
          </button>
        </div>
      )}
    </div>
  );
}

function ProgressBar({ pct, label }: { pct: number; label: string }) {
  return (
    <div>
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          height: 8,
          background: "var(--sand-100)",
          borderRadius: 999,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: "var(--emerald)",
            transition: "width 0.2s ease-out",
          }}
        />
      </div>
      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
        {label}
      </div>
    </div>
  );
}

// Indeterminate striped bar for phases without numeric progress.
function Indeterminate() {
  return (
    <div
      style={{
        width: "100%",
        maxWidth: 480,
        height: 8,
        background: "var(--sand-100)",
        borderRadius: 999,
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "repeating-linear-gradient(45deg, var(--emerald) 0 12px, var(--emerald-2) 12px 24px)",
          animation: "indeterminate-pan 1s linear infinite",
        }}
      />
      <style>{`
        @keyframes indeterminate-pan {
          0%   { transform: translateX(-24px); }
          100% { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

// File extension preserved so ffmpeg picks the right demuxer.
function extensionFor(file: File): string {
  const m = file.name.match(/\.[a-z0-9]{2,5}$/i);
  return m ? m[0].toLowerCase() : ".mp4";
}

// Copy a Uint8Array into a freshly-allocated ArrayBuffer before wrapping
// in a Blob. Works around TS variance: ffmpeg.wasm hands back
// Uint8Array<ArrayBufferLike>, but Blob's BlobPart only accepts views
// over a plain ArrayBuffer, not SharedArrayBuffer.
function toBlob(data: Uint8Array, type: string): Blob {
  const ab = new ArrayBuffer(data.byteLength);
  new Uint8Array(ab).set(data);
  return new Blob([ab], { type });
}
