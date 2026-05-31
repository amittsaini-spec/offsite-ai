import Link from "next/link";
import { prisma } from "@/lib/db";
import { fmt } from "@/lib/data";

export const dynamic = "force-dynamic";

// Per-hotel rollup of COMPLETED bookings. Pending = COMPLETED with
// payoutStatus PENDING (= money we owe the hotel); Paid = COMPLETED with
// payoutStatus PAID.
type HotelRow = {
  hotelId: string;
  hotelName: string;
  city: string;
  bookings: number;
  gross: number;
  take: number;
  netOwed: number;
  netPaid: number;
};

export default async function Revenue() {
  // Pull every COMPLETED booking once; everything below is in-memory
  // aggregation. Volume is small enough that a single query beats N
  // groupBy round-trips.
  const completed = await prisma.bookingRequest.findMany({
    where: { status: "COMPLETED" },
    include: {
      venue: { select: { hotelId: true, hotel: { select: { name: true, city: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  const rows = new Map<string, HotelRow>();
  for (const b of completed) {
    const key = b.venue.hotelId;
    const cur = rows.get(key) ?? {
      hotelId: key,
      hotelName: b.venue.hotel.name,
      city: b.venue.hotel.city,
      bookings: 0,
      gross: 0,
      take: 0,
      netOwed: 0,
      netPaid: 0,
    };
    cur.bookings += 1;
    cur.gross += b.total ?? 0;
    cur.take += b.serviceFee ?? 0;
    if (b.payoutStatus === "PAID") cur.netPaid += b.basePrice ?? 0;
    else cur.netOwed += b.basePrice ?? 0;
    rows.set(key, cur);
  }

  const sorted = Array.from(rows.values()).sort((a, b) => b.gross - a.gross);

  // Totals across all hotels for the headline KPI strip.
  const totalGross = sorted.reduce((s, r) => s + r.gross, 0);
  const totalTake = sorted.reduce((s, r) => s + r.take, 0);
  const totalOwed = sorted.reduce((s, r) => s + r.netOwed, 0);
  const totalPaid = sorted.reduce((s, r) => s + r.netPaid, 0);

  return (
    <>
      <div className="atop">
        <div>
          <div className="ah1">Revenue</div>
          <div className="asub">
            Per-hotel breakdown of COMPLETED bookings, with payouts you owe and
            payouts you&apos;ve cleared. Concierge-first: payouts are marked
            manually for now.
          </div>
        </div>
      </div>

      <div className="kgrid" style={{ marginBottom: 22 }}>
        <Kpi label="Total gross" big={fmt(totalGross)} sub="Sum total of COMPLETED bookings" money />
        <Kpi label="Offsite take" big={fmt(totalTake)} sub="12% service fee on COMPLETED" money />
        <Kpi label="Owed to hotels" big={fmt(totalOwed)} sub="Pending payouts (basePrice)" money />
        <Kpi label="Paid out" big={fmt(totalPaid)} sub="Cleared payouts (basePrice)" money />
      </div>

      <div className="panel">
        <h3>Hotels</h3>
        {sorted.length === 0 ? (
          <div className="empty">
            No completed bookings yet — once a booking reaches COMPLETED its
            payout shows up here.
          </div>
        ) : (
          sorted.map((r) => (
            <Link
              key={r.hotelId}
              href={`/admin/revenue/${r.hotelId}`}
              className="trow"
            >
              <div>
                <div className="tmain">{r.hotelName}</div>
                <div className="tsub">
                  {r.city} · {r.bookings} completed booking
                  {r.bookings === 1 ? "" : "s"}
                </div>
              </div>
              <div
                className="tsp"
                style={{ display: "flex", gap: 22, alignItems: "center" }}
              >
                <Stat label="Gross" value={fmt(r.gross)} />
                <Stat label="Take" value={fmt(r.take)} />
                <Stat
                  label="Owed"
                  value={fmt(r.netOwed)}
                  warn={r.netOwed > 0}
                />
                <Stat label="Paid" value={fmt(r.netPaid)} ok={r.netPaid > 0} />
              </div>
            </Link>
          ))
        )}
      </div>
    </>
  );
}

function Stat({
  label,
  value,
  warn,
  ok,
}: {
  label: string;
  value: string;
  warn?: boolean;
  ok?: boolean;
}) {
  return (
    <div style={{ minWidth: 88, textAlign: "right" }}>
      <div
        style={{
          fontFamily: "'Fraunces',serif",
          fontWeight: 600,
          fontSize: 16,
          color: warn ? "var(--coral-d)" : ok ? "var(--emerald)" : "var(--ink)",
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: ".05em",
          textTransform: "uppercase",
          color: "var(--muted)",
          marginTop: 2,
        }}
      >
        {label}
      </div>
    </div>
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
      <div className="sn">{big}</div>
      <div className="sl">{label}</div>
      <div className="ss">{sub}</div>
    </div>
  );
}
