"use client";

import { useMemo, useState } from "react";
import { uploadOne, BLOB_READY } from "@/app/_components/blobUpload";

type VideoMode = "upload" | "embed";

export default function VenueMediaEditor({
  initialPhotos,
  initialVideoUrl,
  initialTourUrl,
  initialFloorPlans,
}: {
  initialPhotos: string[];
  initialVideoUrl: string;
  initialTourUrl: string;
  initialFloorPlans: string[];
}) {
  const [photos, setPhotos] = useState<string[]>(initialPhotos);
  const [floorPlans, setFloorPlans] = useState<string[]>(initialFloorPlans);
  const [tourUrl, setTourUrl] = useState(initialTourUrl);
  const [videoUrl, setVideoUrl] = useState(initialVideoUrl);
  const [videoMode, setVideoMode] = useState<VideoMode>(
    initialVideoUrl && !looksLikeBlobVideo(initialVideoUrl) ? "embed" : "upload",
  );

  const photosJson = useMemo(() => JSON.stringify(photos), [photos]);
  const floorPlansJson = useMemo(() => JSON.stringify(floorPlans), [floorPlans]);

  return (
    <div>
      {!BLOB_READY && (
        <div
          style={{
            padding: "10px 14px",
            background: "#fdf2dc",
            color: "#7a5a14",
            borderRadius: 10,
            fontSize: 13,
            marginBottom: 14,
          }}
        >
          File uploads are off — enable Vercel Blob and set
          {" "}<code>BLOB_READ_WRITE_TOKEN</code> + <code>NEXT_PUBLIC_BLOB_READY=true</code>
          {" "}in <code>.env</code> (and Vercel) to enable photo / video upload.
          Embed URLs and tour links still save.
        </div>
      )}

      {/* hidden mirrors so the server action reads everything */}
      <input type="hidden" name="photos" value={photosJson} />
      <input type="hidden" name="videoUrl" value={videoUrl} />
      <input type="hidden" name="tourUrl" value={tourUrl} />
      <input type="hidden" name="floorPlans" value={floorPlansJson} />

      <PhotoGrid photos={photos} setPhotos={setPhotos} disabled={!BLOB_READY} />

      <div className="fsec" style={{ marginTop: 28 }}>Video</div>
      <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
        <label style={{ fontSize: 14, display: "flex", gap: 6 }}>
          <input
            type="radio"
            checked={videoMode === "upload"}
            onChange={() => setVideoMode("upload")}
            disabled={!BLOB_READY}
          />
          Upload file
        </label>
        <label style={{ fontSize: 14, display: "flex", gap: 6 }}>
          <input
            type="radio"
            checked={videoMode === "embed"}
            onChange={() => setVideoMode("embed")}
          />
          YouTube / Vimeo URL
        </label>
      </div>

      {videoMode === "upload" ? (
        <VideoUpload
          videoUrl={videoUrl}
          setVideoUrl={setVideoUrl}
          disabled={!BLOB_READY}
        />
      ) : (
        <input
          className="input"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=… or https://vimeo.com/…"
        />
      )}

      <div className="fsec" style={{ marginTop: 28 }}>Virtual tour</div>
      <input
        className="input"
        value={tourUrl}
        onChange={(e) => setTourUrl(e.target.value)}
        placeholder="https://my.matterport.com/show/?m=… (renders as 'Launch 360° tour')"
      />

      <div className="fsec" style={{ marginTop: 28 }}>Floor plan / layout renderings</div>
      <FloorPlanGrid
        plans={floorPlans}
        setPlans={setFloorPlans}
        disabled={!BLOB_READY}
      />
    </div>
  );
}

/* ───────────────────────── photo grid ───────────────────────── */

function PhotoGrid({
  photos,
  setPhotos,
  disabled,
}: {
  photos: string[];
  setPhotos: (p: string[]) => void;
  disabled: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  async function onPick(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    setErr(null);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        const url = await uploadOne(file, "venues/photos");
        uploaded.push(url);
      }
      setPhotos([...photos, ...uploaded]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  function remove(i: number) {
    setPhotos(photos.filter((_, idx) => idx !== i));
  }
  function setCover(i: number) {
    if (i === 0) return;
    const next = [...photos];
    const [picked] = next.splice(i, 1);
    next.unshift(picked);
    setPhotos(next);
  }
  function onDragStart(i: number) {
    setDragIndex(i);
  }
  function onDragOver(e: React.DragEvent, overIdx: number) {
    e.preventDefault();
    if (dragIndex === null || dragIndex === overIdx) return;
    const next = [...photos];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(overIdx, 0, moved);
    setDragIndex(overIdx);
    setPhotos(next);
  }
  function onDragEnd() {
    setDragIndex(null);
  }

  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: 12,
          marginBottom: 12,
        }}
      >
        {photos.map((url, i) => (
          <div
            key={url}
            draggable
            onDragStart={() => onDragStart(i)}
            onDragOver={(e) => onDragOver(e, i)}
            onDragEnd={onDragEnd}
            style={{
              position: "relative",
              aspectRatio: "4/3",
              borderRadius: 12,
              overflow: "hidden",
              border: "1px solid var(--line)",
              cursor: "grab",
              background: "#000",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
            {i === 0 && (
              <span
                style={{
                  position: "absolute",
                  top: 8,
                  left: 8,
                  background: "var(--emerald)",
                  color: "#fff",
                  padding: "3px 8px",
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: ".04em",
                }}
              >
                COVER
              </span>
            )}
            <div
              style={{
                position: "absolute",
                bottom: 8,
                right: 8,
                display: "flex",
                gap: 6,
              }}
            >
              {i !== 0 && (
                <button
                  type="button"
                  onClick={() => setCover(i)}
                  style={btnTiny}
                  title="Make cover"
                >
                  Cover
                </button>
              )}
              <button
                type="button"
                onClick={() => remove(i)}
                style={{ ...btnTiny, background: "var(--coral)" }}
                title="Remove"
              >
                ✕
              </button>
            </div>
          </div>
        ))}

        <label
          style={{
            aspectRatio: "4/3",
            border: "1.5px dashed var(--line)",
            borderRadius: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled ? 0.5 : 1,
            color: "var(--muted)",
            fontSize: 13,
            textAlign: "center",
            padding: 12,
          }}
        >
          {busy ? "Uploading…" : "+ Add photos"}
          <input
            type="file"
            accept="image/*"
            multiple
            disabled={disabled || busy}
            onChange={(e) => onPick(e.target.files)}
            style={{ display: "none" }}
          />
        </label>
      </div>

      {err && <div style={{ color: "var(--coral-d)", fontSize: 13 }}>{err}</div>}
      <div style={{ color: "var(--muted)", fontSize: 12 }}>
        Drag to reorder. First photo is the cover.
      </div>
    </div>
  );
}

/* ───────────────────────── video upload ───────────────────────── */

function VideoUpload({
  videoUrl,
  setVideoUrl,
  disabled,
}: {
  videoUrl: string;
  setVideoUrl: (s: string) => void;
  disabled: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onPick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setErr(null);
    try {
      const url = await uploadOne(file, "venues/video");
      setVideoUrl(url);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {videoUrl && looksLikeBlobVideo(videoUrl) && (
        <video
          src={videoUrl}
          controls
          style={{
            width: "100%",
            maxWidth: 480,
            borderRadius: 12,
            marginBottom: 12,
            border: "1px solid var(--line)",
          }}
        />
      )}
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
        {busy ? "Uploading…" : videoUrl ? "Replace video" : "+ Upload video"}
        <input
          type="file"
          accept="video/*"
          disabled={disabled || busy}
          onChange={(e) => onPick(e.target.files?.[0])}
          style={{ display: "none" }}
        />
      </label>
      {videoUrl && (
        <button
          type="button"
          onClick={() => setVideoUrl("")}
          className="pill no"
          style={{ marginLeft: 10 }}
        >
          Clear
        </button>
      )}
      {err && (
        <div style={{ color: "var(--coral-d)", fontSize: 13, marginTop: 8 }}>{err}</div>
      )}
    </div>
  );
}

/* ───────────────────────── floor plans ───────────────────────── */

function FloorPlanGrid({
  plans,
  setPlans,
  disabled,
}: {
  plans: string[];
  setPlans: (p: string[]) => void;
  disabled: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onPick(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    setErr(null);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        const url = await uploadOne(file, "venues/floorplans");
        uploaded.push(url);
      }
      setPlans([...plans, ...uploaded]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  function remove(i: number) {
    setPlans(plans.filter((_, idx) => idx !== i));
  }

  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: 12,
          marginBottom: 12,
        }}
      >
        {plans.map((url, i) => (
          <div
            key={url}
            style={{
              position: "relative",
              aspectRatio: "4/3",
              borderRadius: 12,
              overflow: "hidden",
              border: "1px solid var(--line)",
              background: "var(--sand-100)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
            <button
              type="button"
              onClick={() => remove(i)}
              style={{
                ...btnTiny,
                background: "var(--coral)",
                position: "absolute",
                bottom: 8,
                right: 8,
              }}
              title="Remove"
            >
              ✕
            </button>
          </div>
        ))}
        <label
          style={{
            aspectRatio: "4/3",
            border: "1.5px dashed var(--line)",
            borderRadius: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled ? 0.5 : 1,
            color: "var(--muted)",
            fontSize: 13,
            textAlign: "center",
            padding: 12,
          }}
        >
          {busy ? "Uploading…" : "+ Add floor plans"}
          <input
            type="file"
            accept="image/*"
            multiple
            disabled={disabled || busy}
            onChange={(e) => onPick(e.target.files)}
            style={{ display: "none" }}
          />
        </label>
      </div>
      {err && <div style={{ color: "var(--coral-d)", fontSize: 13 }}>{err}</div>}
    </div>
  );
}

/* ───────────────────────── tiny helpers ───────────────────────── */

const btnTiny: React.CSSProperties = {
  background: "rgba(0,0,0,.7)",
  color: "#fff",
  border: "none",
  borderRadius: 999,
  padding: "4px 10px",
  fontSize: 11,
  fontWeight: 700,
  cursor: "pointer",
};

function looksLikeBlobVideo(url: string) {
  return /\.(mp4|webm|mov)(\?|$)/i.test(url) || url.includes("blob.vercel-storage.com");
}
