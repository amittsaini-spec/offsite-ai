import { prisma } from "@/lib/db";
import { parseArray } from "@/lib/data";
import {
  jsonCached,
  jsonNoCache,
  preflight,
  requireApiKey,
} from "@/lib/apiAuth";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return preflight();
}

// GET /api/v1/hotels
// Returns every hotel with a lightweight cover derived from the first
// photo of the hotel's first PUBLISHED venue (Hotel has no photo field
// of its own). Consumers use this for a picker / index view before
// drilling into a single hotel via /api/v1/hotels/{id}.
export async function GET(req: Request) {
  const authErr = requireApiKey(req);
  if (authErr) return authErr;

  try {
    const hotels = await prisma.hotel.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        venues: {
          where: { status: "PUBLISHED" },
          orderBy: { createdAt: "asc" },
          select: { photos: true },
        },
      },
    });

    const data = hotels.map((h) => ({
      id: h.id,
      name: h.name,
      city: h.city,
      cover: coverFrom(h.venues),
    }));

    return jsonCached({ hotels: data });
  } catch (err) {
    return jsonNoCache(
      { error: err instanceof Error ? err.message : "Internal error" },
      500,
    );
  }
}

function coverFrom(venues: { photos: string }[]): string | null {
  for (const v of venues) {
    const photos = parseArray(v.photos);
    if (photos.length > 0) return photos[0];
  }
  return null;
}
