"use client";

import { useCallback, useEffect, useState } from "react";

type Props = {
  photos: string[];
  floorPlans: string[];
  tourUrl: string;
  // Gradient fallback (CSS background string) used when no cover photo exists.
  fallbackGradient: string;
};

// 5-cell gallery (1 large + 4 small) that mirrors the existing dgallery
// layout, plus a click-to-open lightbox for the venue's photos. Floor plans
// share the supporting cells but are not opened in the lightbox.
export default function PhotoGallery({
  photos,
  floorPlans,
  tourUrl,
  fallbackGradient,
}: Props) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const hasPhotos = photos.length > 0;

  const open = useCallback((i: number) => setLightboxIndex(i), []);
  const close = useCallback(() => setLightboxIndex(null), []);
  const next = useCallback(
    () => setLightboxIndex((cur) => (cur === null ? null : (cur + 1) % photos.length)),
    [photos.length],
  );
  const prev = useCallback(
    () =>
      setLightboxIndex((cur) =>
        cur === null ? null : (cur - 1 + photos.length) % photos.length,
      ),
    [photos.length],
  );

  // Keyboard support: Esc closes, arrows navigate.
  useEffect(() => {
    if (lightboxIndex === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxIndex, close, next, prev]);

  // Lock body scroll while lightbox is open.
  useEffect(() => {
    if (lightboxIndex === null) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [lightboxIndex]);

  return (
    <>
      <div className="dgallery">
        {/* Cover: photo 0 if present, gradient fallback otherwise.
            Click → lightbox at index 0. Tour CTA overlays the cover when set. */}
        <CoverCell
          src={photos[0]}
          fallbackGradient={fallbackGradient}
          clickable={hasPhotos}
          onClick={() => open(0)}
        >
          {tourUrl && (
            <a
              href="#tour"
              className="gtag"
              style={{ background: "rgba(0,0,0,.65)", color: "#fff" }}
              onClick={(e) => {
                // Prevent the parent cell's open() from firing.
                e.stopPropagation();
              }}
            >
              ◎ Launch 360° virtual tour
            </a>
          )}
          {hasPhotos && (
            <span
              className="pcount"
              onClick={(e) => {
                e.stopPropagation();
                open(0);
              }}
            >
              ⛶ {photos.length} {photos.length === 1 ? "photo" : "photos"}
            </span>
          )}
        </CoverCell>

        {/* Up to 4 supporting cells: extra photos first, then floor plans. */}
        {[1, 2, 3, 4].map((i) => {
          const photo = photos[i];
          const floorIdx = i - 1 - Math.max(photos.length - 1, 0);
          const floor = floorPlans[floorIdx];
          const src = photo ?? floor;
          const isFloor = !photo && !!floor;
          const onClick = photo ? () => open(i) : undefined;
          return (
            <div
              key={i}
              onClick={onClick}
              style={{
                background: fallbackGradient,
                backgroundImage: src ? `url(${src})` : fallbackGradient,
                backgroundSize: isFloor ? "contain" : "cover",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "center",
                filter: src ? undefined : `hue-rotate(${i * 11}deg)`,
                cursor: onClick ? "pointer" : "default",
              }}
            >
              {isFloor && <span className="gtag">Layout renderings</span>}
            </div>
          );
        })}
      </div>

      {lightboxIndex !== null && (
        <Lightbox
          photos={photos}
          index={lightboxIndex}
          onClose={close}
          onNext={next}
          onPrev={prev}
        />
      )}
    </>
  );
}

function CoverCell({
  src,
  fallbackGradient,
  clickable,
  onClick,
  children,
}: {
  src?: string;
  fallbackGradient: string;
  clickable: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      onClick={clickable ? onClick : undefined}
      style={{
        background: fallbackGradient,
        backgroundImage: src ? `url(${src})` : fallbackGradient,
        backgroundSize: "cover",
        backgroundPosition: "center",
        position: "relative",
        cursor: clickable ? "pointer" : "default",
      }}
    >
      {children}
    </div>
  );
}

function Lightbox({
  photos,
  index,
  onClose,
  onNext,
  onPrev,
}: {
  photos: string[];
  index: number;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
}) {
  return (
    <div
      className="lightbox"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Photo gallery"
    >
      <button
        className="lb-close"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Close"
      >
        ✕
      </button>

      {photos.length > 1 && (
        <>
          <button
            className="lb-nav lb-prev"
            onClick={(e) => {
              e.stopPropagation();
              onPrev();
            }}
            aria-label="Previous photo"
          >
            ‹
          </button>
          <button
            className="lb-nav lb-next"
            onClick={(e) => {
              e.stopPropagation();
              onNext();
            }}
            aria-label="Next photo"
          >
            ›
          </button>
        </>
      )}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photos[index]}
        alt=""
        className="lb-img"
        onClick={(e) => e.stopPropagation()}
      />

      <div className="lb-count">
        {index + 1} / {photos.length}
      </div>
    </div>
  );
}
