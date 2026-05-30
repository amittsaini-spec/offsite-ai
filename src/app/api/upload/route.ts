import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

// Client-direct Vercel Blob upload route. The browser asks here for a
// short-lived signed token, then uploads straight to Blob storage — that
// way we sidestep Vercel's 4.5 MB function payload limit and can take
// large photos / short videos.
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        // Gate uploads to authenticated agents only.
        const user = await getCurrentUser();
        if (!user) {
          throw new Error("Not authenticated");
        }

        return {
          allowedContentTypes: [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/avif",
            "image/heic",
            "image/heif",
            "video/mp4",
            "video/webm",
            "video/quicktime",
          ],
          maximumSizeInBytes: 100 * 1024 * 1024, // 100 MB — comfortable for short hero videos
          tokenPayload: JSON.stringify({
            userId: user.id,
            pathname,
          }),
        };
      },
      onUploadCompleted: async () => {
        // We track uploaded URLs in the venue record on form submit,
        // so nothing to do here.
      },
    });

    return NextResponse.json(json);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 400 },
    );
  }
}
