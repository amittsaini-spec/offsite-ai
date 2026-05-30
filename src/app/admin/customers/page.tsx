import Link from "next/link";
import { prisma } from "@/lib/db";
import { fmt, relativeTime, STATUS_PILL, STATUS_LABEL, type BookingStatus } from "@/lib/data";

export const dynamic = "force-dynamic";

type SP = { q?: string };

export default async function Customers({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().toLowerCase();

  // Pull every booking once and aggregate by email in-process. This is
  // fine for now (booking volume is small); when it grows we'd push the
  // grouping into Postgres with a real distinct + aggregate query.
  const bookings = await prisma.bookingRequest.findMany({
    orderBy: { createdAt: "desc" },
    include: { venue: { select: { name: true, hotelId: true, hotel: { select: { name: true } } } } },
  });

  type Row = {
    email: string;
    name: string;
    count: number;
    lastAt: Date;
    lastVenue: string;
    lastStatus: BookingStatus;
    totalSpend: number;
  };

  const map = new Map<string, Row>();
  for (const b of bookings) {
    if (!b.guestEmail) continue;
    const key = b.guestEmail.toLowerCase();
    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        email: b.guestEmail,
        name: b.guestName || b.guestEmail,
        count: 1,
        lastAt: b.createdAt,
        lastVenue: b.venue.name,
        lastStatus: b.status as BookingStatus,
        totalSpend: b.total ?? 0,
      });
    } else {
      existing.count += 1;
      existing.totalSpend += b.total ?? 0;
      if (b.createdAt > existing.lastAt) {
        existing.lastAt = b.createdAt;
        existing.lastVenue = b.venue.name;
        existing.lastStatus = b.status as BookingStatus;
      }
    }
  }

  let customers = Array.from(map.values()).sort(
    (a, b) => b.lastAt.getTime() - a.lastAt.getTime(),
  );
  if (q) {
    customers = customers.filter(
      (c) => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q),
    );
  }

  return (
    <>
      <div className="atop">
        <div>
          <div className="ah1">Customers</div>
          <div className="asub">
            {customers.length} unique guest{customers.length === 1 ? "" : "s"}
            {q ? " matching the search" : " who have requested a booking"}.
          </div>
        </div>
      </div>

      <form
        action="/admin/customers"
        method="get"
        style={{ display: "flex", gap: 12, marginBottom: 18, alignItems: "center" }}
      >
        <input
          className="search-input"
          name="q"
          defaultValue={sp.q ?? ""}
          placeholder="Search by name or email…"
        />
        <button type="submit" className="btn-emerald" style={{ fontSize: 13 }}>
          Search
        </button>
        {q && (
          <Link href="/admin/customers" className="fclear">
            Clear
          </Link>
        )}
      </form>

      <div className="panel">
        {customers.length === 0 ? (
          <div className="empty">
            {q ? "Nobody matches that search." : "No guests yet."}
          </div>
        ) : (
          customers.map((c) => (
            <Link
              key={c.email}
              href={`/admin/customers/${encodeURIComponent(c.email)}`}
              className="trow"
            >
              <div>
                <div className="tmain">{c.name}</div>
                <div className="tsub">{c.email}</div>
              </div>
              <div
                className="tsp"
                style={{ display: "flex", alignItems: "center", gap: 14 }}
              >
                <span style={{ fontWeight: 600, fontSize: 14 }}>
                  {c.count} booking{c.count === 1 ? "" : "s"}
                </span>
                <span style={{ color: "var(--muted)", fontSize: 12.5 }}>
                  {fmt(c.totalSpend)} lifetime
                </span>
                <span className={"pill " + STATUS_PILL[c.lastStatus]}>
                  {STATUS_LABEL[c.lastStatus]}
                </span>
                <span style={{ color: "var(--muted)", fontSize: 12.5 }}>
                  {relativeTime(c.lastAt)}
                </span>
              </div>
            </Link>
          ))
        )}
      </div>
    </>
  );
}
