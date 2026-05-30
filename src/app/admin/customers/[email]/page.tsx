import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  fmt,
  relativeTime,
  STATUS_PILL,
  STATUS_LABEL,
  BLOCKING_STATUSES,
  type BookingStatus,
} from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function CustomerDetail({
  params,
}: {
  params: Promise<{ email: string }>;
}) {
  const { email: rawEmail } = await params;
  // Next.js decodes URL params automatically when reading from `params`,
  // but normalize to lowercase for the case-insensitive Postgres match.
  const email = decodeURIComponent(rawEmail);

  // Case-insensitive equality so capitalization quirks in the public form
  // don't fragment a guest's history across two records.
  const bookings = await prisma.bookingRequest.findMany({
    where: { guestEmail: { equals: email, mode: "insensitive" } },
    include: { venue: { include: { hotel: { select: { name: true } } } } },
    orderBy: { createdAt: "desc" },
  });

  if (bookings.length === 0) notFound();

  const name = bookings.find((b) => b.guestName)?.guestName || email;
  const totalSpend = bookings.reduce((s, b) => s + (b.total ?? 0), 0);
  const realizedSpend = bookings
    .filter((b) => b.status === "COMPLETED")
    .reduce((s, b) => s + (b.total ?? 0), 0);
  const blocking = bookings.filter((b) =>
    (BLOCKING_STATUSES as readonly string[]).includes(b.status),
  ).length;
  const openCount = bookings.filter((b) => b.status === "REQUESTED").length;

  // Favorite hotel = the hotel with the most bookings from this guest.
  const hotelCounts = new Map<string, number>();
  for (const b of bookings) {
    const h = b.venue.hotel.name;
    hotelCounts.set(h, (hotelCounts.get(h) ?? 0) + 1);
  }
  const favoriteHotel = [...hotelCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

  return (
    <>
      <Link href="/admin/customers" className="back">
        ← All customers
      </Link>

      <div className="atop" style={{ marginTop: 10 }}>
        <div>
          <div className="ah1">{name}</div>
          <div className="asub">
            <a href={`mailto:${email}`} style={{ color: "var(--emerald)" }}>
              {email}
            </a>
          </div>
        </div>
      </div>

      <div className="kgrid" style={{ marginBottom: 22 }}>
        <Kpi label="Bookings" big={`${bookings.length}`} sub={`${openCount} open`} />
        <Kpi
          label="Locked-in"
          big={`${blocking}`}
          sub="Confirmed / deposit / completed"
        />
        <Kpi
          label="Lifetime value"
          big={fmt(totalSpend)}
          sub={`${fmt(realizedSpend)} realized`}
          money
        />
        <Kpi
          label="Favorite property"
          big={favoriteHotel ?? "—"}
          sub={favoriteHotel ? `${hotelCounts.get(favoriteHotel)} bookings` : ""}
        />
      </div>

      <div className="panel">
        <h3>Booking history</h3>
        {bookings.map((b) => {
          const status = b.status as BookingStatus;
          return (
            <Link key={b.id} href={`/admin/bookings/${b.id}`} className="trow">
              <div>
                <div className="tmain">
                  {b.venue.name}{" "}
                  <span style={{ color: "var(--muted)", fontWeight: 500 }}>
                    at {b.venue.hotel.name}
                  </span>
                </div>
                <div className="tsub">
                  {b.eventType} · {b.eventDate || "no date"} · {b.guests} guests
                </div>
              </div>
              <div
                className="tsp"
                style={{ display: "flex", alignItems: "center", gap: 14 }}
              >
                <span style={{ fontWeight: 600, fontSize: 14 }}>
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
        })}
      </div>
    </>
  );
}

function Kpi({
  label,
  big,
  sub,
  money,
}: {
  label: string;
  big: string;
  sub: string;
  money?: boolean;
}) {
  return (
    <div className={"stat" + (money ? " kpi-money" : "")}>
      <div
        className="sn"
        style={{ fontSize: big.length > 18 ? 18 : undefined }}
      >
        {big}
      </div>
      <div className="sl">{label}</div>
      {sub && <div className="ss">{sub}</div>}
    </div>
  );
}
