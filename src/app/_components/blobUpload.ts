// Shared client-side uploader. HEIC/HEIF/AVIF go through our server-
// proxied transcode route so the stored blob is always a JPEG that every
// browser can display; every other type uses the existing client-direct
// @vercel/blob upload (no 4.5 MB function payload limit, faster).

import { upload } from "@vercel/blob/client";

const CONVERT_RE = /^image\/(heic|heif|avif)$/i;
const CONVERT_EXT = /\.(heic|heif|avif)$/i;

export async function uploadOne(file: File, pathPrefix: string): Promise<string> {
  const needsConvert =
    CONVERT_RE.test(file.type || "") || CONVERT_EXT.test(file.name);

  if (needsConvert) {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("pathPrefix", pathPrefix);
    const res = await fetch("/api/transcode-upload", {
      method: "POST",
      body: fd,
    });
    if (!res.ok) {
      const e = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(e.error || "Transcode upload failed");
    }
    const json = (await res.json()) as { url: string };
    return json.url;
  }

  const blob = await upload(`${pathPrefix}/${Date.now()}-${file.name}`, file, {
    access: "public",
    handleUploadUrl: "/api/upload",
  });
  return blob.url;
}

// Public flag the editors check before exposing the upload controls.
// Mirrors what VenueMediaEditor reads — kept in sync via env so both
// editors react to the same toggle.
export const BLOB_READY = process.env.NEXT_PUBLIC_BLOB_READY === "true";

// Module-load diagnostic so the browser DevTools console can confirm
// what the *running* client bundle actually inlined. If you see
// `BLOB_READY = false` here while .env says "true", you're looking at a
// stale bundle — close the tab and reopen, don't rely on Cmd-Shift-R.
if (typeof window !== "undefined") {
  // eslint-disable-next-line no-console
  console.log(
    "[blobUpload] BLOB_READY =",
    BLOB_READY,
    "(raw NEXT_PUBLIC_BLOB_READY =",
    JSON.stringify(process.env.NEXT_PUBLIC_BLOB_READY),
    ")",
  );
}
