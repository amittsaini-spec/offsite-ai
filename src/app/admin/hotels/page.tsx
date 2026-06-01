import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  fmt,
  fromPrice,
  gradFor,
  VENUE_TYPES,
  parseArray,
  venueHealth,
} from "@/lib/data";
import { toggleVenueStatusAction } from "@/lib/actions";
import HealthBadge from "../_components/HealthBadge";

export const dynamic = "force-dynamic";

type SP = { q?: string; type?: string };

export default async function HotelsAndVenues({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const typeFilter = sp.type && (VENUE_TYPES as readonly string[]).includes(sp.type)
    ? sp.type
    : null;

  // Build the Prisma filter. We match the search against EITHER the hotel
  // name OR any nested venue name so a single text search finds both.
  const hotelWhere: Prisma.HotelWhereInput = {};
  if (q) {
    hotelWhere.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { city: { contains: q, mode: "insensitive" } },
      { venues: { some: { name: { contains: q, mode: "insensitive" } } } },
    ];
  }

  // Eager-load venues; type filter applied at the venue level so an empty
  // hotel can still surface (with a "0 matching" subtitle) for editing.
  const venueWhere: Prisma.VenueWhereInput = {};
  if (typeFilter) venueWhere.type = typeFilter;
  if (q) {
    venueWhere.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { hotel: { name: { contains: q, mode: "insensitive" } } },
    ];
  }

  const hotels = await prisma.hotel.findMany({
    where: hotelWhere,
    include: {
      venues: {
        where: venueWhere,
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { name: "asc" },
  });

  const totalVenueCount = hotels.reduce((s, h) => s + h.venues.length, 0);
  const hasFilters = Boolean(q || typeFilter);

  function withType(t: string | null) {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (t) p.set("type", t);
    const s = p.toString();
    return s ? `/admin/hotels?${s}` : "/admin/hotels";
  }

  return (
    <>
      <div className="atop">
        <div>
          <div className="ah1">Hotels &amp; Venues</div>
          <div className="asub">
            {hotels.length} hotel{hotels.length === 1 ? "" : "s"} ·{" "}
            {totalVenueCount} {hasFilters ? "matching" : "total"} venue
            {totalVenueCount === 1 ? "" : "s"}
          </div>
        </div>
        <Link href="/admin/hotels/new" className="btn-emerald">
          + New hotel
        </Link>
      </div>

      {/* Search form — plain GET so the URL holds state */}
      <form
        action="/admin/hotels"
        method="get"
        style={{ display: "flex", gap: 12, marginBottom: 14, alignItems: "center" }}
      >
        {typeFilter && <input type="hidden" name="type" value={typeFilter} />}
        <input
          className="search-input"
          name="q"
          defaultValue={q}
          placeholder="Search by hotel, city, or venue name…"
        />
        <button type="submit" className="btn-emerald" style={{ fontSize: 13 }}>
          Search
        </button>
        {hasFilters && (
          <Link href="/admin/hotels" className="fclear">
            Clear
          </Link>
        )}
      </form>

      <div className="fchips">
        <Link className={"fchip" + (!typeFilter ? " on" : "")} href={withType(null)}>
          All types
        </Link>
        {VENUE_TYPES.map((t) => (
          <Link
            key={t}
            className={"fchip" + (typeFilter === t ? " on" : "")}
            href={withType(t)}
          >
            {t}
          </Link>
        ))}
      </div>

      {hotels.length === 0 ? (
        <div className="panel">
          <div className="empty">
            {hasFilters
              ? "Nothing matches those filters."
              : "No hotels yet. Add one to get started."}
          </div>
        </div>
      ) : (
        hotels.map((h) => (
          <div key={h.id} className="hcard">
            <div className="hcard-head">
              <div>
                <div className="hh">{h.name}</div>
                <div className="hsub">
                  {h.city}
                  {h.brand ? ` · ${h.brand}` : ""} · {h.venues.length} venue
                  {h.venues.length === 1 ? "" : "s"}
                </div>
              </div>
              <Link href={`/admin/hotels/${h.id}`} className="btn-ghost">
                Open hotel →
              </Link>
            </div>

            {h.venues.length === 0 ? (
              <div className="empty" style={{ padding: 28 }}>
                No matching venues under this hotel.
              </div>
            ) : (
              h.venues.map((v) => {
                const cover = parseArray(v.photos)[0];
                const start = fromPrice(v.pricingOptions, v.basePrice);
                const health = venueHealth(v);
                return (
                  <div key={v.id} className="trow">
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 10,
                        background: cover ? "#000" : gradFor(v.type),
                        backgroundImage: cover ? `url(${cover})` : undefined,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        flexShrink: 0,
                      }}
                    />
                    <div>
                      <div className="tmain">{v.name}</div>
                      <div className="tsub">
                        {v.type} · seated {v.seated} · standing {v.standing}
                        {start > 0 ? ` · from ${fmt(start)}` : ""}
                      </div>
                    </div>
                    <div
                      className="tsp"
                      style={{ display: "flex", alignItems: "center", gap: 10 }}
                    >
                      <HealthBadge venueId={v.id} health={health} />
                      <span
                        className={
                          "pill " + (v.status === "PUBLISHED" ? "ok" : "draft")
                        }
                      >
                        {v.status}
                      </span>
                      <form
                        action={toggleVenueStatusAction}
                        style={{ display: "inline" }}
                      >
                        <input type="hidden" name="id" value={v.id} />
                        <button
                          type="submit"
                          className="pill draft"
                          style={{
                            textTransform: "uppercase",
                            cursor: "pointer",
                            border: "none",
                          }}
                          title={
                            v.status === "PUBLISHED" ? "Move to draft" : "Publish"
                          }
                        >
                          {v.status === "PUBLISHED" ? "→ Draft" : "→ Publish"}
                        </button>
                      </form>
                      <Link
                        href={`/admin/venues/${v.id}/edit`}
                        className="pill draft"
                        style={{ textTransform: "uppercase" }}
                      >
                        Edit
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ))
      )}
    </>
  );
}
