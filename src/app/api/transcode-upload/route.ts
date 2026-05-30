// Server-proxied upload for image formats that don't display reliably in
// every browser (HEIC/HEIF from iPhones, AVIF in older Chrome/Firefox).
//
// Why a separate route from /api/upload?
//   /api/upload uses @vercel/blob/client's handleUpload — the browser uploads
//   straight to Blob storage, so we never see the bytes. To transcode, we need
//   the bytes server-side, so HEIC/HEIF/AVIF files come HERE as multipart and
//   the server uses the @vercel/blob put() helper after sharp/heic-convert.
//
// Trade-off: this path is subject to Vercel's serverless body limit
// (4.5 MB default). Most iPhone HEIC files are 1–3 MB so this is fine in
// practice; if a huge file is rejected, the agent gets a clear error.

import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import sharp from "sharp";
import convert from "heic-convert";

export const runtime = "nodejs";
export const maxDuration = 60; // HEIC decoding in pure JS is not instant.

const CONVERT_MIME = new Set(["image/heic", "image/heif", "image/avif"]);
const CONVERT_EXT = /\.(heic|heif|avif)$/i;

export async function POST(req: Request): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart body" }, { status: 400 });
  }

  const file = form.get("file");
  const pathPrefix = (form.get("pathPrefix") ?? "venues/photos")
    .toString()
    .replace(/^\/+|\/+$/g, "");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const mime = (file.type || "").toLowerCase();
  const needsConvert = CONVERT_MIME.has(mime) || CONVERT_EXT.test(file.name);

  let buffer = Buffer.from(await file.arrayBuffer());
  let outName = file.name;
  let contentType = file.type || "application/octet-stream";

  if (needsConvert) {
    try {
      const isAvif = mime === "image/avif" || /\.avif$/i.test(file.name);
      if (isAvif) {
        // sharp handles AVIF input on all platforms.
        buffer = await sharp(buffer)
          .jpeg({ quality: 85, mozjpeg: true })
          .toBuffer();
      } else {
        // HEIC/HEIF — pure-JS so it works on Vercel's Linux runtime where
        // sharp's HEIF support is not included in the prebuilt binary.
        const out = await convert({
          buffer: new Uint8Array(buffer),
          format: "JPEG",
          quality: 0.9,
        });
        buffer = Buffer.from(out);
      }
      outName = file.name.replace(CONVERT_EXT, "") + ".jpg";
      contentType = "image/jpeg";
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? `Transcode failed: ${err.message}` : "Transcode failed" },
        { status: 500 },
      );
    }
  }

  const pathname = `${pathPrefix}/${Date.now()}-${outName}`;
  try {
    const blob = await put(pathname, buffer, {
      access: "public",
      contentType,
    });
    return NextResponse.json({ url: blob.url, pathname: blob.pathname });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 500 },
    );
  }
}
