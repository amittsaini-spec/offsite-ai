import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  fmt,
  relativeTime,
  STATUS_LABEL,
  STATUS_PILL,
  BOOKING_STATUSES,
  type BookingStatus,
} from "@/lib/data";

export const dynamic = "force-dynamic";

type SP = {
  status?: string;
  hotel?: string;
  venue?: string;
  from?: string;
  to?: string;
};

const YMD = /^\d{4}-\d{2}-\d{2}$/;

export default async function Bookings({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const statusFilter =
    sp.status && (BOOKING_STATUSES as readonly string[]).includes(sp.status)
      ? (sp.status as BookingStatus)
      : null;

  // Hotels + venues for the filter dropdowns. Hotels come back ordered for
  // a stable dropdown; venues are pulled with their hotel for the label.
  const [hotels, venues] = await Promise.all([
    prisma.hotel.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.venue.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, hotelId: true, hotel: { select: { name: true } } },
    }),
  ]);

  // Build the Prisma where clause from the active filters.
  const where: Prisma.BookingRequestWhereInput = {};
  if (statusFilter) where.status = statusFilter;
  if (sp.venue) where.venueId = sp.venue;
  else if (sp.hotel) where.venue = { hotelId: sp.hotel };
  // Event-date range. eventDate is a YYYY-MM-DD string so lexicographic
  // comparison matches calendar order.
  if (sp.from && YMD.test(sp.from)) {
    where.eventDate = { ...(where.eventDate as object), gte: sp.from };
  }
  if (sp.to && YMD.test(sp.to)) {
    where.eventDate = { ...(where.eventDate as object), lte: sp.to };
  }

  const bookings = await prisma.bookingRequest.findMany({
    where,
    include: { venue: { include: { hotel: true } } },
    orderBy: { createdAt: "desc" },
  });

  const hasFilters = Boolean(
    statusFilter || sp.hotel || sp.venue || sp.from || sp.to,
  );

  // Status chip links preserve all other filter params, just swap status.
  function withStatus(status: BookingStatus | null) {
    const p = new URLSearchParams();
    if (status) p.set("status", status);
    if (sp.hotel) p.set("hotel", sp.hotel);
    if (sp.venue) p.set("venue", sp.venue);
    if (sp.from) p.set("from", sp.from);
    if (sp.to) p.set("to", sp.to);
    const q = p.toString();
    return q ? `/admin/bookings?${q}` : "/admin/bookings";
  }

  return (
    <>
      <div className="atop">
        <div>
          <div className="ah1">Bookings</div>
          <div className="asub">
            {bookings.length} {hasFilters ? "matching" : "total"} ·
            {" "}concierge-first — payments wire in here next.
          </div>
        </div>
      </div>

      {/* Status chips — switch between status views, "All" clears just the status filter */}
      <div className="fchips">
        <Link className={"fchip" + (!statusFilter ? " on" : "")} href={withStatus(null)}>
          All
        </Link>
        {BOOKING_STATUSES.map((s) => (
          <Link
            key={s}
            className={"fchip" + (statusFilter === s ? " on" : "")}
            href={withStatus(s)}
          >
            {STATUS_LABEL[s]}
          </Link>
        ))}
      </div>

      {/* Filter bar — hotel + venue + date range, plain GET form */}
      <form className="fbar" action="/admin/bookings" method="get">
        {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
        <div className="ff">
          <label htmlFor="hotel">Hotel</label>
          <select id="hotel" name="hotel" defaultValue={sp.hotel ?? ""}>
            <option value="">All hotels</option>
            {hotels.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        </div>
        <div className="ff">
          <label htmlFor="venue">Venue</label>
          <select id="venue" name="venue" defaultValue={sp.venue ?? ""}>
            <option value="">All venues</option>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} — {v.hotel.name}
              </option>
            ))}
          </select>
        </div>
        <div className="ff">
          <label htmlFor="from">Event from</label>
          <input id="from" name="from" type="date" defaultValue={sp.from ?? ""} />
        </div>
        <div className="ff">
          <label htmlFor="to">Event to</label>
          <input id="to" name="to" type="date" defaultValue={sp.to ?? ""} />
        </div>
        <div className="fspacer" />
        <button className="fapply" type="submit">
          Apply
        </button>
        {hasFilters && (
          <Link className="fclear" href="/admin/bookings">
            Clear
          </Link>
        )}
      </form>

      <div className="panel">
        {bookings.length === 0 ? (
          <div className="empty">
            {hasFilters
              ? "No bookings match those filters."
              : "No booking requests yet."}
          </div>
        ) : (
          bookings.map((b) => {
            const status = b.status as BookingStatus;
            return (
              <Link key={b.id} href={`/admin/bookings/${b.id}`} className="trow">
                <div>
                  <div className="tmain">
                    {b.guestName}{" "}
                    <span style={{ color: "var(--muted)", fontWeight: 500 }}>
                      → {b.venue.name}
                    </span>
                  </div>
                  <div className="tsub">
                    {b.venue.hotel.name} · {b.eventType} ·{" "}
                    {b.eventDate || "no date set"} · {b.guests} guests
                  </div>
                </div>
                <div
                  className="tsp"
                  style={{ display: "flex", alignItems: "center", gap: 14 }}
                >
                  <span
                    style={{ fontWeight: 600, fontSize: 14 }}
                    title={`Service fee ${fmt(b.serviceFee)}`}
                  >
                    {fmt(b.total)}
                  </span>
                  <span style={{ color: "var(--muted)", fontSize: 12.5 }}>
                    {relativeTime(b.createdAt)}
                  </span>
                  <span className={"pill " + STATUS_PILL[status]}>
                    {STATUS_LABEL[status]}
                  </span>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </>
  );
}
