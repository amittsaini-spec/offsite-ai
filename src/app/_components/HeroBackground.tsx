"use client";

import { useEffect, useState } from "react";
import { embedFromUrl } from "@/lib/data";

type Props = {
  mediaType: string; // none | image | video | slideshow
  mediaUrls: string[];
  videoEmbed: string;
  posterUrl?: string;
};

// The hero background plus the readable cream overlay. Always renders
// absolute-positioned behind the hero content; the parent .hero-wrap is
// the offset parent (position:relative + isolation).
//
// Video mode behavior:
//   - Always paints the poster (when set) as a static layer so SSR + first
//     paint already show the right image.
//   - Decides at hydration whether to mount the <video> on top based on
//     window.matchMedia: skips it on small viewports and when the visitor
//     has prefers-reduced-motion enabled. The static poster then remains
//     as the background — no autoplay, no battery drain.
//   - When mounted, the <video> also gets the poster prop so its native
//     buffering frame matches the static layer (no visible flash).
export default function HeroBackground({
  mediaType,
  mediaUrls,
  videoEmbed,
  posterUrl,
}: Props) {
  const usableUrls = mediaUrls.filter(Boolean);
  if (mediaType === "none") return null;
  if (mediaType === "image" && usableUrls.length === 0) return null;
  if (mediaType === "slideshow" && usableUrls.length === 0) return null;
  if (
    mediaType === "video" &&
    !videoEmbed &&
    usableUrls.length === 0 &&
    !posterUrl
  ) {
    // Nothing to render for video mode — no source, no fallback.
    return null;
  }

  return (
    <div className="hero-bg" aria-hidden>
      {mediaType === "image" && <ImageLayer url={usableUrls[0]} />}
      {mediaType === "video" && (
        <VideoLayer
          videoEmbed={videoEmbed}
          blobUrl={usableUrls[0]}
          posterUrl={posterUrl}
        />
      )}
      {mediaType === "slideshow" && <Slideshow urls={usableUrls} />}
      <div className="hero-bg-scrim" />
    </div>
  );
}

function ImageLayer({ url }: { url: string }) {
  return (
    <div
      className="hero-bg-layer"
      style={{ backgroundImage: `url(${url})` }}
    />
  );
}

function VideoLayer({
  videoEmbed,
  blobUrl,
  posterUrl,
}: {
  videoEmbed: string;
  blobUrl?: string;
  posterUrl?: string;
}) {
  // Default to NOT playing — SSR matches mobile / reduced-motion behavior.
  // The effect upgrades to playback on eligible clients.
  const [shouldPlay, setShouldPlay] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const small = window.matchMedia("(max-width: 760px)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const evaluate = () => setShouldPlay(!small.matches && !reduced.matches);
    evaluate();
    // Re-evaluate if the viewport resizes across the breakpoint or the
    // visitor toggles motion preferences mid-session.
    small.addEventListener("change", evaluate);
    reduced.addEventListener("change", evaluate);
    return () => {
      small.removeEventListener("change", evaluate);
      reduced.removeEventListener("change", evaluate);
    };
  }, []);

  const embed = videoEmbed ? embedFromUrl(videoEmbed) : null;

  return (
    <>
      {posterUrl && (
        <div
          className="hero-bg-layer"
          style={{
            backgroundImage: `url(${posterUrl})`,
            // Override the slideshow fade transition — the poster is static.
            transition: "none",
            opacity: 1,
          }}
        />
      )}

      {shouldPlay && embed && (
        <iframe
          src={`${embed}${embed.includes("?") ? "&" : "?"}autoplay=1&mute=1&loop=1&controls=0&playsinline=1`}
          className="hero-bg-iframe"
          allow="autoplay; encrypted-media"
        />
      )}
      {shouldPlay && !embed && blobUrl && (
        <video
          className="hero-bg-video"
          src={blobUrl}
          autoPlay
          muted
          loop
          playsInline
          poster={posterUrl || undefined}
          preload="auto"
        />
      )}
    </>
  );
}

function Slideshow({ urls }: { urls: string[] }) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (urls.length < 2) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % urls.length), 6000);
    return () => clearInterval(t);
  }, [urls.length]);

  return (
    <>
      {urls.map((url, i) => (
        <div
          key={url + i}
          className="hero-bg-layer hero-bg-fade"
          style={{
            backgroundImage: `url(${url})`,
            opacity: i === index ? 1 : 0,
          }}
        />
      ))}
    </>
  );
}
