"use client";

import { useMemo, useState } from "react";
import { uploadOne, BLOB_READY } from "@/app/_components/blobUpload";
import { updateSiteSettingsAction } from "@/lib/actions";
import type { SearchPlaceholders } from "@/lib/data";
import CompressedVideoPicker from "./CompressedVideoPicker";

type MediaType = "none" | "image" | "video" | "slideshow";

type Props = {
  initial: {
    heroEyebrow: string;
    heroHeadline: string;
    heroSubhead: string;
    heroMediaType: string;
    heroMedia: string[];
    heroVideoEmbed: string;
    heroPoster: string;
    searchPlaceholders: SearchPlaceholders;
  };
};

type VideoMode = "upload" | "embed";

export default function HeroSettingsEditor({ initial }: Props) {
  const [mediaType, setMediaType] = useState<MediaType>(
    (["none", "image", "video", "slideshow"] as const).includes(
      initial.heroMediaType as MediaType,
    )
      ? (initial.heroMediaType as MediaType)
      : "none",
  );
  const [media, setMedia] = useState<string[]>(initial.heroMedia);
  const [videoEmbed, setVideoEmbed] = useState(initial.heroVideoEmbed);
  const [poster, setPoster] = useState(initial.heroPoster);
  const [videoMode, setVideoMode] = useState<VideoMode>(
    initial.heroVideoEmbed ? "embed" : "upload",
  );

  // The form action reads media URLs from a single hidden JSON input.
  const mediaJson = useMemo(() => JSON.stringify(media), [media]);

  return (
    <form action={updateSiteSettingsAction} className="formcard">
      <div className="fsec" style={{ marginTop: 0, paddingTop: 0, borderTop: "none" }}>
        Headline
      </div>

      <div className="field">
        <label>Eyebrow</label>
        <input
          className="input"
          name="heroEyebrow"
          defaultValue={initial.heroEyebrow}
          placeholder="Now live · Cancún test market"
        />
      </div>
      <div className="field">
        <label>Headline</label>
        <input
          className="input"
          name="heroHeadline"
          defaultValue={initial.heroHeadline}
          placeholder="The hotel's most beautiful spaces, *finally* bookable."
        />
        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
          Wrap a word in <code>*asterisks*</code> to italicize it.
        </div>
      </div>
      <div className="field">
        <label>Subhead</label>
        <textarea
          className="textarea"
          name="heroSubhead"
          defaultValue={initial.heroSubhead}
          rows={3}
        />
      </div>

      <div className="fsec">Search bar labels</div>
      <div className="fgrid">
        <div className="field">
          <label>Where</label>
          <input
            className="input"
            name="ph_where"
            defaultValue={initial.searchPlaceholders.where}
          />
        </div>
        <div className="field">
          <label>Event</label>
          <input
            className="input"
            name="ph_event"
            defaultValue={initial.searchPlaceholders.event}
          />
        </div>
      </div>
      <div className="fgrid">
        <div className="field">
          <label>Date</label>
          <input
            className="input"
            name="ph_date"
            defaultValue={initial.searchPlaceholders.date}
          />
        </div>
        <div className="field">
          <label>Guests</label>
          <input
            className="input"
            name="ph_guests"
            defaultValue={initial.searchPlaceholders.guests}
          />
        </div>
      </div>

      <div className="fsec">Background</div>
      <input type="hidden" name="heroMediaType" value={mediaType} />
      <input type="hidden" name="heroMedia" value={mediaJson} />
      <input type="hidden" name="heroVideoEmbed" value={mediaType === "video" && videoMode === "embed" ? videoEmbed : ""} />
      <input type="hidden" name="heroPoster" value={mediaType === "video" ? poster : ""} />

      <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginBottom: 14 }}>
        {(["none", "image", "video", "slideshow"] as const).map((opt) => (
          <label key={opt} style={{ fontSize: 14, display: "flex", gap: 6 }}>
            <input
              type="radio"
              checked={mediaType === opt}
              onChange={() => setMediaType(opt)}
            />
            {opt === "none"
              ? "No background"
              : opt === "image"
                ? "Single image"
                : opt === "video"
                  ? "Video"
                  : "Slideshow"}
          </label>
        ))}
      </div>

      {!BLOB_READY && mediaType !== "none" && (
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
          File uploads are off. Set <code>NEXT_PUBLIC_BLOB_READY=true</code>{" "}
          in <code>.env</code> to enable. Embed URLs still save.
        </div>
      )}

      {mediaType === "none" && (
        <div style={{ color: "var(--muted)", fontSize: 13 }}>
          The hero stays on the current cream background.
        </div>
      )}

      {mediaType === "image" && (
        <SingleImagePicker
          url={media[0] ?? ""}
          onChange={(u) => setMedia(u ? [u] : [])}
        />
      )}

      {mediaType === "video" && (
        <>
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
            <CompressedVideoPicker
              videoUrl={media[0] ?? ""}
              onVideoChange={(u) => setMedia(u ? [u] : [])}
              // Compressor auto-extracts the first frame as the poster.
              // The manual poster picker below still works as an override.
              onPosterChange={(u) => setPoster(u)}
              disabled={!BLOB_READY}
            />
          ) : (
            <input
              className="input"
              value={videoEmbed}
              onChange={(e) => setVideoEmbed(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=…"
            />
          )}

          {/* Poster image: shown during buffering AND used as the static
              background on mobile / prefers-reduced-motion. */}
          <div style={{ marginTop: 22 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: ".06em",
                textTransform: "uppercase",
                color: "var(--muted)",
                marginBottom: 8,
              }}
            >
              Poster image
            </div>
            <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 10 }}>
              Shown before the video loads and as the still fallback on mobile
              or when a visitor has reduced-motion enabled.
            </div>
            <SingleImagePicker
              url={poster}
              onChange={setPoster}
            />
          </div>
        </>
      )}

      {mediaType === "slideshow" && (
        <SlideshowGrid urls={media} onChange={setMedia} />
      )}

      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 14 }}>
        A cream overlay sits on top of the background so the headline and search bar stay readable.
      </div>

      <button
        className="submit"
        type="submit"
        style={{ maxWidth: 240, marginTop: 24 }}
      >
        Save hero →
      </button>
    </form>
  );
}

/* ───────────────────────── pickers ───────────────────────── */

function SingleImagePicker({
  url,
  onChange,
}: {
  url: string;
  onChange: (u: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onPick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setErr(null);
    try {
      const u = await uploadOne(file, "home/hero");
      onChange(u);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {url && (
        <div
          style={{
            width: "100%",
            maxWidth: 480,
            aspectRatio: "16/9",
            borderRadius: 12,
            background: `#000 url(${url}) center/cover no-repeat`,
            marginBottom: 10,
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
          cursor: busy ? "wait" : "pointer",
          color: "var(--ink-2)",
          fontSize: 14,
        }}
      >
        {busy ? "Uploading…" : url ? "Replace image" : "+ Upload image"}
        <input
          type="file"
          accept="image/*"
          disabled={busy}
          onChange={(e) => onPick(e.target.files?.[0])}
          style={{ display: "none" }}
        />
      </label>
      {url && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="pill no"
          style={{ marginLeft: 10 }}
        >
          Clear
        </button>
      )}
      {err && (
        <div style={{ color: "var(--coral-d)", fontSize: 13, marginTop: 8 }}>
          {err}
        </div>
      )}
    </div>
  );
}

function SlideshowGrid({
  urls,
  onChange,
}: {
  urls: string[];
  onChange: (u: string[]) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  async function onPick(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    setErr(null);
    try {
      const out: string[] = [];
      for (const file of Array.from(files)) {
        out.push(await uploadOne(file, "home/hero"));
      }
      onChange([...urls, ...out]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  function remove(i: number) {
    onChange(urls.filter((_, idx) => idx !== i));
  }
  function onDragOver(e: React.DragEvent, overIdx: number) {
    e.preventDefault();
    if (dragIndex === null || dragIndex === overIdx) return;
    const next = [...urls];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(overIdx, 0, moved);
    setDragIndex(overIdx);
    onChange(next);
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
        {urls.map((url, i) => (
          <div
            key={url}
            draggable
            onDragStart={() => setDragIndex(i)}
            onDragOver={(e) => onDragOver(e, i)}
            onDragEnd={() => setDragIndex(null)}
            style={{
              position: "relative",
              aspectRatio: "16/9",
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
            <button
              type="button"
              onClick={() => remove(i)}
              style={{
                position: "absolute",
                top: 8,
                right: 8,
                background: "var(--coral)",
                color: "#fff",
                border: "none",
                borderRadius: 999,
                padding: "4px 10px",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              ✕
            </button>
          </div>
        ))}

        <label
          style={{
            aspectRatio: "16/9",
            border: "1.5px dashed var(--line)",
            borderRadius: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: busy ? "wait" : "pointer",
            color: "var(--muted)",
            fontSize: 13,
          }}
        >
          {busy ? "Uploading…" : "+ Add images"}
          <input
            type="file"
            accept="image/*"
            multiple
            disabled={busy}
            onChange={(e) => onPick(e.target.files)}
            style={{ display: "none" }}
          />
        </label>
      </div>
      <div style={{ color: "var(--muted)", fontSize: 12 }}>
        Drag to reorder. Cross-fade every 6 seconds.
      </div>
      {err && <div style={{ color: "var(--coral-d)", fontSize: 13 }}>{err}</div>}
    </div>
  );
}
