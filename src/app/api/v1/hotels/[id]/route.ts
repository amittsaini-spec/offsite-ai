import { prisma } from "@/lib/db";
import {
  BLOCKING_STATUSES,
  parseArray,
  parseDateArray,
  parsePricingOptions,
} from "@/lib/data";
import {
  jsonCached,
  jsonNoCache,
  preflight,
  requireApiKey,
} from "@/lib/apiAuth";

export const dynamic = "force-dynamic";

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

export function OPTIONS() {
  return preflight();
}

// GET /api/v1/hotels/{id}
// Hotel core + every PUBLISHED venue with the fields DWBC needs to price
// and check availability. blackoutDates is the practical "can't book"
// set: admin-set blackouts merged with dates from CONFIRMED /
// DEPOSIT_HELD / COMPLETED bookings, deduped and sorted.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authErr = requireApiKey(req);
  if (authErr) return authErr;

  const { id } = await params;

  try {
    const hotel = await prisma.hotel.findUnique({
      where: { id },
      include: {
        venues: {
          where: { status: "PUBLISHED" },
          orderBy: { createdAt: "asc" },
          include: {
            bookings: {
              where: { status: { in: BLOCKING_STATUSES } },
              select: { eventDate: true },
            },
          },
        },
      },
    });

    if (!hotel) {
      return jsonNoCache({ error: "Hotel not found" }, 404);
    }

    const venues = hotel.venues.map((v) => {
      const photos = parseArray(v.photos);
      const adminBlackouts = parseDateArray(v.blackoutDates);
      const bookingDates = v.bookings
        .map((b) => b.eventDate)
        .filter((d) => YMD_RE.test(d));
      const blackoutDates = Array.from(
        new Set([...adminBlackouts, ...bookingDates]),
      ).sort();

      return {
        id: v.id,
        name: v.name,
        type: v.type,
        description: v.description,
        seated: v.seated,
        standing: v.standing,
        sqft: v.sqft,
        pricingOptions: parsePricingOptions(v.pricingOptions),
        cover: photos[0] ?? null,
        photos,
        blackoutDates,
      };
    });

    const cover = venues.find((v) => v.cover)?.cover ?? null;

    return jsonCached({
      id: hotel.id,
      name: hotel.name,
      brand: hotel.brand,
      description: hotel.description,
      market: hotel.market,
      address: hotel.address,
      city: hotel.city,
      region: hotel.region,
      country: hotel.country,
      latitude: hotel.latitude,
      longitude: hotel.longitude,
      cover,
      venues,
    });
  } catch (err) {
    return jsonNoCache(
      { error: err instanceof Error ? err.message : "Internal error" },
      500,
    );
  }
}
