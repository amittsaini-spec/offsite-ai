"use client";

import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type Dispatch,
  type DragEvent,
  type SetStateAction,
} from "react";
import { uploadOne, BLOB_READY } from "@/app/_components/blobUpload";
import { useFileDrop } from "./useFileDrop";
import {
  useUploadQueue,
  validateImage,
  SUPPORTED_IMAGE_ACCEPT,
  type FailedUpload,
  type PendingUpload,
} from "./useUploadQueue";

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

      <ImageGrid
        images={photos}
        setImages={setPhotos}
        disabled={!BLOB_READY}
        pathPrefix="venues/photos"
        noun="photos"
        reorderable
        showCover
      />

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
      <ImageGrid
        images={floorPlans}
        setImages={setFloorPlans}
        disabled={!BLOB_READY}
        pathPrefix="venues/floorplans"
        noun="floor plans"
        fit="contain"
      />
    </div>
  );
}

/* ───────────────────── image grid with drag & drop upload ───────────────────── */

function ImageGrid({
  images,
  setImages,
  disabled,
  pathPrefix,
  noun,
  reorderable = false,
  showCover = false,
  fit = "cover",
}: {
  images: string[];
  setImages: Dispatch<SetStateAction<string[]>>;
  disabled: boolean;
  pathPrefix: string;
  /** Plural, lower-case — used in labels ("Add photos", "Drop to add floor plans"). */
  noun: string;
  /** Allow drag-to-reorder of existing tiles. */
  reorderable?: boolean;
  /** Badge the first tile as the cover and offer "Cover" on the rest. */
  showCover?: boolean;
  fit?: "cover" | "contain";
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const onUploaded = useCallback(
    (urls: string[]) => setImages((prev) => [...prev, ...urls]),
    [setImages],
  );
  const { pending, failed, enqueue, dismissFailed } = useUploadQueue({
    pathPrefix,
    validate: validateImage,
    onUploaded,
  });
  const { isOver, dropProps } = useFileDrop({ onFiles: enqueue, disabled });

  const browse = () => inputRef.current?.click();

  function remove(i: number) {
    setImages((prev) => prev.filter((_, idx) => idx !== i));
  }
  function setCover(i: number) {
    if (i === 0) return;
    setImages((prev) => {
      const next = [...prev];
      const [picked] = next.splice(i, 1);
      next.unshift(picked);
      return next;
    });
  }

  // Tile reordering (in-page drag). Stamping text data makes Firefox start
  // the drag, and lets useFileDrop tell it apart from an OS file drag.
  function onTileDragStart(e: DragEvent, i: number) {
    e.dataTransfer.setData("text/plain", String(i));
    e.dataTransfer.effectAllowed = "move";
    setDragIndex(i);
  }
  function onTileDragOver(e: DragEvent, overIdx: number) {
    if (dragIndex === null) return; // a file drag — let the drop zone handle it
    e.preventDefault();
    if (dragIndex === overIdx) return;
    setImages((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(overIdx, 0, moved);
      return next;
    });
    setDragIndex(overIdx);
  }
  function onTileDragEnd() {
    setDragIndex(null);
  }

  const empty = images.length === 0 && pending.length === 0;
  const dropActive = isOver && !disabled;

  return (
    <div>
      <div
        {...dropProps}
        style={{
          position: "relative",
          borderRadius: 14,
          outline: `2px dashed ${dropActive ? "var(--emerald)" : "transparent"}`,
          outlineOffset: 6,
          background: dropActive ? "rgba(15,61,48,.05)" : "transparent",
          transition: "background .15s, outline-color .15s",
        }}
      >
        {empty ? (
          <EmptyDropTarget
            noun={noun}
            disabled={disabled}
            active={dropActive}
            onBrowse={browse}
          />
        ) : (
          <div style={GRID}>
            {images.map((url, i) => (
              <div
                key={url}
                draggable={reorderable}
                onDragStart={reorderable ? (e) => onTileDragStart(e, i) : undefined}
                onDragOver={reorderable ? (e) => onTileDragOver(e, i) : undefined}
                onDragEnd={reorderable ? onTileDragEnd : undefined}
                style={{
                  ...TILE,
                  cursor: reorderable ? "grab" : "default",
                  background: fit === "contain" ? "var(--sand-100)" : "#000",
                  opacity: dragIndex === i ? 0.5 : 1,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: fit }}
                />
                {showCover && i === 0 && <span style={BADGE_COVER}>COVER</span>}
                <div
                  style={{
                    position: "absolute",
                    bottom: 8,
                    right: 8,
                    display: "flex",
                    gap: 6,
                  }}
                >
                  {showCover && i !== 0 && (
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

            {pending.map((item) => (
              <PendingTile key={item.id} item={item} fit={fit} />
            ))}

            <button
              type="button"
              onClick={browse}
              disabled={disabled}
              style={{
                ...ADD_TILE,
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.5 : 1,
              }}
            >
              + Add {noun}
            </button>
          </div>
        )}

        {dropActive && !empty && (
          <div style={DROP_OVERLAY} aria-hidden>
            <span style={DROP_LABEL}>Drop to add {noun}</span>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={SUPPORTED_IMAGE_ACCEPT}
        multiple
        disabled={disabled}
        onChange={(e) => {
          enqueue(Array.from(e.target.files ?? []));
          e.target.value = ""; // let the same file be picked again later
        }}
        style={{ display: "none" }}
      />

      {failed.length > 0 && <FailedList failed={failed} onDismiss={dismissFailed} />}

      <div style={{ color: "var(--muted)", fontSize: 12, margin: "10px 0 16px" }}>
        Drag &amp; drop {noun} anywhere in this area, or click to browse.
        {reorderable && " Drag tiles to reorder; the first one is the cover."}
      </div>
    </div>
  );
}

function EmptyDropTarget({
  noun,
  disabled,
  active,
  onBrowse,
}: {
  noun: string;
  disabled: boolean;
  active: boolean;
  onBrowse: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onBrowse}
      disabled={disabled}
      style={{
        width: "100%",
        minHeight: 180,
        padding: "28px 20px",
        border: `1.5px dashed ${active ? "var(--emerald)" : "var(--line)"}`,
        borderRadius: 12,
        background: active ? "rgba(15,61,48,.06)" : "var(--sand-50)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        color: active ? "var(--emerald)" : "var(--ink-2)",
        textAlign: "center",
        transition: "background .15s, border-color .15s",
      }}
    >
      <UploadIcon />
      <span style={{ fontSize: 15, fontWeight: 700, color: active ? "var(--emerald)" : "var(--ink)" }}>
        {active ? `Drop to add ${noun}` : `Drag & drop ${noun} here`}
      </span>
      <span style={{ fontSize: 13, color: "var(--muted)" }}>
        or click to browse · JPG, PNG, WebP, HEIC
      </span>
    </button>
  );
}

function PendingTile({ item, fit }: { item: PendingUpload; fit: "cover" | "contain" }) {
  // HEIC previews can't render in most browsers — fall back to the file name.
  const [broken, setBroken] = useState(false);
  const done = item.status === "done";
  const label =
    done ? "✓ Uploaded" : item.status === "uploading" ? "Uploading…" : "Queued";

  return (
    <div style={{ ...TILE, background: "var(--sand-100)" }} title={item.name}>
      {broken ? (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 12,
            fontSize: 12,
            color: "var(--muted)",
            textAlign: "center",
            wordBreak: "break-all",
          }}
        >
          {item.name}
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.preview}
          alt=""
          onError={() => setBroken(true)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: fit,
            opacity: done ? 1 : 0.55,
          }}
        />
      )}
      <span
        style={{
          ...BADGE_COVER,
          background: done ? "var(--emerald)" : "rgba(0,0,0,.6)",
          letterSpacing: 0,
        }}
      >
        {label}
      </span>
      {!done && <div className="upl-bar" />}
    </div>
  );
}

function FailedList({
  failed,
  onDismiss,
}: {
  failed: FailedUpload[];
  onDismiss: () => void;
}) {
  return (
    <div className="err" style={{ marginTop: 12, marginBottom: 0 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
        }}
      >
        <strong>
          {failed.length === 1
            ? "1 file wasn't uploaded"
            : `${failed.length} files weren't uploaded`}
        </strong>
        <button
          type="button"
          onClick={onDismiss}
          style={{ color: "inherit", fontWeight: 700, fontSize: 12 }}
        >
          Dismiss
        </button>
      </div>
      <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
        {failed.map((f) => (
          <li key={f.id}>
            {f.name}: {f.error}
          </li>
        ))}
      </ul>
    </div>
  );
}

function UploadIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 16V4" />
      <path d="m7 9 5-5 5 5" />
      <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
    </svg>
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

/* ───────────────────────── styles & helpers ───────────────────────── */

const GRID: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
  gap: 12,
};

const TILE: CSSProperties = {
  position: "relative",
  aspectRatio: "4/3",
  borderRadius: 12,
  overflow: "hidden",
  border: "1px solid var(--line)",
};

const ADD_TILE: CSSProperties = {
  aspectRatio: "4/3",
  border: "1.5px dashed var(--line)",
  borderRadius: 12,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "var(--muted)",
  fontSize: 13,
  textAlign: "center",
  padding: 12,
};

const BADGE_COVER: CSSProperties = {
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
};

const DROP_OVERLAY: CSSProperties = {
  position: "absolute",
  inset: -6,
  borderRadius: 14,
  background: "rgba(250,247,241,.82)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  pointerEvents: "none",
  zIndex: 2,
};

const DROP_LABEL: CSSProperties = {
  background: "var(--emerald)",
  color: "#fff",
  padding: "10px 18px",
  borderRadius: 999,
  fontWeight: 700,
  fontSize: 14,
  boxShadow: "var(--shadow)",
};

const btnTiny: CSSProperties = {
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
