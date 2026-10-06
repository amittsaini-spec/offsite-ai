"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { uploadOne } from "@/app/_components/blobUpload";

export type PendingUpload = {
  id: string;
  name: string;
  /** Object URL for a local thumbnail while the upload is in flight. */
  preview: string;
  status: "queued" | "uploading" | "done";
};

export type FailedUpload = { id: string; name: string; error: string };

type QueueItem = PendingUpload & { file: File; url?: string };

const CONCURRENCY = 3;

let seq = 0;
const uid = () => `${Date.now().toString(36)}-${(seq++).toString(36)}`;

// Mirrors the server allowlist in /api/upload plus the HEIC/AVIF transcode
// path. The extension fallback matters because Windows and some Android
// pickers hand us HEIC files with an empty MIME type.
const OK_MIME = /^image\/(jpe?g|png|webp|avif|heic|heif)$/i;
const OK_EXT = /\.(jpe?g|png|webp|avif|heic|heif)$/i;

export function isSupportedImage(file: File): boolean {
  return OK_MIME.test(file.type || "") || OK_EXT.test(file.name);
}

export function validateImage(file: File): string | null {
  return isSupportedImage(file)
    ? null
    : "Unsupported file type. Use JPG, PNG, WebP or HEIC.";
}

/** `accept` attribute for a file input that matches `isSupportedImage`. */
export const SUPPORTED_IMAGE_ACCEPT =
  "image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif," +
  ".jpg,.jpeg,.png,.webp,.avif,.heic,.heif";

/**
 * Uploads files to Blob through a small concurrency pool and hands finished
 * URLs back in the order the files were chosen — so when an agent drops a
 * batch onto an empty grid, the cover is the first photo they picked, not
 * whichever finished first.
 *
 * Accepted files show up in `pending` immediately (with local previews).
 * As the head of the queue completes, URLs flush to `onUploaded` and those
 * tiles go away. Rejected and failed files land in `failed`.
 */
export function useUploadQueue({
  pathPrefix,
  validate,
  onUploaded,
}: {
  pathPrefix: string;
  /** Return an error message to reject a file, or null to accept it. */
  validate: (file: File) => string | null;
  onUploaded: (urls: string[]) => void;
}) {
  const queue = useRef<QueueItem[]>([]);
  const inFlight = useRef(0);
  const [pending, setPending] = useState<PendingUpload[]>([]);
  const [failed, setFailed] = useState<FailedUpload[]>([]);

  const latest = useRef({ validate, onUploaded });
  useEffect(() => {
    latest.current = { validate, onUploaded };
  }, [validate, onUploaded]);

  const sync = useCallback(() => {
    setPending(
      queue.current.map(({ id, name, preview, status }) => ({
        id,
        name,
        preview,
        status,
      })),
    );
  }, []);

  // Hand back every finished item at the head of the queue, in order.
  const flushDone = useCallback(() => {
    const urls: string[] = [];
    while (queue.current.length && queue.current[0].status === "done") {
      const item = queue.current.shift()!;
      URL.revokeObjectURL(item.preview);
      if (item.url) urls.push(item.url);
    }
    if (urls.length) latest.current.onUploaded(urls);
  }, []);

  const pump = useCallback(() => {
    while (inFlight.current < CONCURRENCY) {
      const next = queue.current.find((it) => it.status === "queued");
      if (!next) break;
      next.status = "uploading";
      inFlight.current += 1;
      uploadOne(next.file, pathPrefix)
        .then((url) => {
          next.url = url;
          next.status = "done";
        })
        .catch((e: unknown) => {
          const i = queue.current.indexOf(next);
          if (i >= 0) queue.current.splice(i, 1);
          URL.revokeObjectURL(next.preview);
          setFailed((f) => [
            ...f,
            {
              id: next.id,
              name: next.name,
              error: e instanceof Error ? e.message : "Upload failed",
            },
          ]);
        })
        .finally(() => {
          inFlight.current -= 1;
          flushDone();
          sync();
          pump();
        });
    }
    sync();
  }, [pathPrefix, flushDone, sync]);

  const enqueue = useCallback(
    (files: File[]) => {
      const rejected: FailedUpload[] = [];
      for (const file of files) {
        const problem = latest.current.validate(file);
        if (problem) {
          rejected.push({ id: uid(), name: file.name, error: problem });
          continue;
        }
        queue.current.push({
          id: uid(),
          name: file.name,
          preview: URL.createObjectURL(file),
          status: "queued",
          file,
        });
      }
      if (rejected.length) setFailed((f) => [...f, ...rejected]);
      pump();
    },
    [pump],
  );

  const dismissFailed = useCallback(() => setFailed([]), []);

  // Drop previews (and forget queued work) if the editor unmounts mid-upload.
  useEffect(() => {
    const q = queue;
    return () => {
      for (const item of q.current) URL.revokeObjectURL(item.preview);
      q.current = [];
    };
  }, []);

  return { pending, failed, enqueue, dismissFailed, busy: pending.length > 0 };
}
