import Link from "next/link";
import { prisma } from "@/lib/db";
import { fmt } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const [hotels, venueCount, bookings] = await Promise.all([
    prisma.hotel.findMany({
      include: { _count: { select: { venues: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.venue.count(),
    prisma.bookingRequest.findMany({
      include: { venue: { include: { hotel: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const pipeline = await prisma.bookingRequest.aggregate({
    _sum: { total: true },
    where: { status: { not: "DECLINED" } },
  });
  const requests = await prisma.bookingRequest.count({ where: { status: "REQUESTED" } });

  return (
    <>
      <div className="atop">
        <div>
          <div className="ah1">Dashboard</div>
          <div className="asub">Everything you manage on the hotels&apos; behalf.</div>
        </div>
        <Link href="/admin/hotels/new" className="btn-emerald">
          + New hotel
        </Link>
      </div>

      <div className="stats">
        <div className="stat">
          <div className="sn">{hotels.length}</div>
          <div className="sl">Hotels</div>
        </div>
        <div className="stat">
          <div className="sn">{venueCount}</div>
          <div className="sl">Venues live</div>
        </div>
        <div className="stat">
          <div className="sn">{requests}</div>
          <div className="sl">Open requests</div>
        </div>
        <div className="stat">
          <div className="sn">{fmt(pipeline._sum.total || 0)}</div>
          <div className="sl">Pipeline value</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 22 }}>
        <div className="panel">
          <h3>Hotels</h3>
          {hotels.length === 0 ? (
            <div className="empty">
              No hotels yet.{" "}
              <Link href="/admin/hotels/new" style={{ color: "var(--emerald)", fontWeight: 600 }}>
                Create the first one →
              </Link>
            </div>
          ) : (
            hotels.map((h) => (
              <Link key={h.id} href={`/admin/hotels/${h.id}`} className="trow">
                <div>
                  <div className="tmain">{h.name}</div>
                  <div className="tsub">{h.city}</div>
                </div>
                <div className="tsp tsub">{h._count.venues} venues</div>
              </Link>
            ))
          )}
        </div>

        <div className="panel">
          <h3>Recent requests</h3>
          {bookings.length === 0 ? (
            <div className="empty">No requests yet.</div>
          ) : (
            bookings.map((b) => (
              <div key={b.id} className="trow">
                <div>
                  <div className="tmain">{b.venue.name}</div>
                  <div className="tsub">
                    {b.guestName} · {fmt(b.total)}
                  </div>
                </div>
                <span
                  className={
                    "tsp pill " +
                    (b.status === "CONFIRMED" ? "ok" : b.status === "DECLINED" ? "no" : "req")
                  }
                >
                  {b.status}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
