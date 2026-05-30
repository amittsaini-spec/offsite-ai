"use client";

import { useEffect, useState } from "react";
import { embedFromUrl } from "@/lib/data";

type Props = {
  mediaType: string; // none | image | video | slideshow
  mediaUrls: string[];
  videoEmbed: string;
};

// The hero background plus the readable cream overlay. Always renders
// absolute-positioned behind the hero content, so the parent must have
// position:relative or the hero block must be the offset parent.
//
// Falls back to no background (transparent) when mediaType=none or the
// requested media is empty — that's the original "today" look.
export default function HeroBackground({ mediaType, mediaUrls, videoEmbed }: Props) {
  const usableUrls = mediaUrls.filter(Boolean);
  if (mediaType === "none") return null;
  if (mediaType === "image" && usableUrls.length === 0) return null;
  if (mediaType === "video" && !videoEmbed && usableUrls.length === 0) return null;
  if (mediaType === "slideshow" && usableUrls.length === 0) return null;

  return (
    <div className="hero-bg" aria-hidden>
      {mediaType === "image" && <ImageLayer url={usableUrls[0]} />}
      {mediaType === "video" && (
        <VideoLayer videoEmbed={videoEmbed} blobUrl={usableUrls[0]} />
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
}: {
  videoEmbed: string;
  blobUrl?: string;
}) {
  // Prefer the embed URL when set (YouTube / Vimeo). Otherwise treat the
  // first uploaded URL as a self-hosted <video> source.
  const embed = videoEmbed ? embedFromUrl(videoEmbed) : null;
  if (embed) {
    // Force autoplay-friendly params, then layer the iframe under the scrim.
    const sep = embed.includes("?") ? "&" : "?";
    const src = `${embed}${sep}autoplay=1&mute=1&loop=1&controls=0&playsinline=1`;
    return <iframe src={src} className="hero-bg-iframe" allow="autoplay; encrypted-media" />;
  }
  if (!blobUrl) return null;
  return (
    <video
      className="hero-bg-video"
      src={blobUrl}
      autoPlay
      muted
      loop
      playsInline
    />
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
