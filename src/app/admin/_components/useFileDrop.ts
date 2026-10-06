"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DragEvent as ReactDragEvent } from "react";

// Marks an element as a file drop zone so the window-level guard below
// knows to leave its dropEffect alone.
const ZONE_ATTR = "data-file-dropzone";

/**
 * True when the drag carries OS files, as opposed to an in-page drag such
 * as tile reordering (which stamps "text/plain" instead).
 */
export function dragHasFiles(e: { dataTransfer: DataTransfer | null }): boolean {
  const types = e.dataTransfer?.types;
  return !!types && Array.from(types).includes("Files");
}

/**
 * Turns any element into a file drop target.
 *
 * - Distinguishes OS file drags from in-page drags by looking for "Files"
 *   in `dataTransfer.types`, so a zone can wrap draggable tiles without the
 *   two interfering.
 * - Tracks enter/leave depth so moving across child elements doesn't
 *   flicker `isOver`.
 * - While mounted, stops the browser from navigating to a file dropped
 *   anywhere *outside* a zone — on an edit form that would throw away
 *   unsaved changes.
 */
export function useFileDrop({
  onFiles,
  disabled = false,
}: {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
}) {
  const [isOver, setIsOver] = useState(false);
  const depth = useRef(0);

  const onFilesRef = useRef(onFiles);
  useEffect(() => {
    onFilesRef.current = onFiles;
  }, [onFiles]);

  const reset = useCallback(() => {
    depth.current = 0;
    setIsOver(false);
  }, []);

  useEffect(() => {
    function onWindowDragOver(e: DragEvent) {
      if (!dragHasFiles(e)) return;
      e.preventDefault();
      const target = e.target instanceof Element ? e.target : null;
      if (e.dataTransfer && !target?.closest(`[${ZONE_ATTR}]`)) {
        e.dataTransfer.dropEffect = "none";
      }
    }
    function onWindowDrop(e: DragEvent) {
      if (dragHasFiles(e)) e.preventDefault();
      reset();
    }
    window.addEventListener("dragover", onWindowDragOver);
    window.addEventListener("drop", onWindowDrop);
    window.addEventListener("dragend", reset);
    return () => {
      window.removeEventListener("dragover", onWindowDragOver);
      window.removeEventListener("drop", onWindowDrop);
      window.removeEventListener("dragend", reset);
    };
  }, [reset]);

  const onDragEnter = useCallback((e: ReactDragEvent<HTMLElement>) => {
    if (!dragHasFiles(e)) return;
    e.preventDefault();
    depth.current += 1;
    if (depth.current === 1) setIsOver(true);
  }, []);

  const onDragOver = useCallback(
    (e: ReactDragEvent<HTMLElement>) => {
      if (!dragHasFiles(e)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = disabled ? "none" : "copy";
    },
    [disabled],
  );

  const onDragLeave = useCallback((e: ReactDragEvent<HTMLElement>) => {
    if (!dragHasFiles(e)) return;
    depth.current = Math.max(0, depth.current - 1);
    if (depth.current === 0) setIsOver(false);
  }, []);

  const onDrop = useCallback(
    (e: ReactDragEvent<HTMLElement>) => {
      if (!dragHasFiles(e)) return;
      e.preventDefault();
      reset();
      if (disabled) return;
      const files = Array.from(e.dataTransfer.files);
      if (files.length) onFilesRef.current(files);
    },
    [disabled, reset],
  );

  return {
    isOver,
    /** Spread onto the element that should accept drops. */
    dropProps: {
      [ZONE_ATTR]: "",
      onDragEnter,
      onDragOver,
      onDragLeave,
      onDrop,
    },
  };
}
