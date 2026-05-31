import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { fmt, relativeTime } from "@/lib/data";
import { togglePayoutAction } from "@/lib/actions";

export const dynamic = "force-dynamic";

const ERROR_LABELS: Record<string, string> = {
  "not-completed":
    "Payout actions are only available on COMPLETED bookings.",
};

export default async function HotelRevenue({
  params,
  searchParams,
}: {
  params: Promise<{ hotelId: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { hotelId } = await params;
  const { saved, error } = await searchParams;

  const hotel = await prisma.hotel.findUnique({
    where: { id: hotelId },
    select: { id: true, name: true, city: true },
  });
  if (!hotel) notFound();

  // All COMPLETED bookings under this hotel, newest first.
  const bookings = await prisma.bookingRequest.findMany({
    where: { status: "COMPLETED", venue: { hotelId } },
    include: { venue: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  const totals = bookings.reduce(
    (acc, b) => {
      acc.gross += b.total ?? 0;
      acc.take += b.serviceFee ?? 0;
      const net = b.basePrice ?? 0;
      if (b.payoutStatus === "PAID") acc.netPaid += net;
      else acc.netOwed += net;
      return acc;
    },
    { gross: 0, take: 0, netPaid: 0, netOwed: 0 },
  );

  const errorMessage = error ? ERROR_LABELS[error] ?? error : null;

  return (
    <>
      <Link href="/admin/revenue" className="back">
        ← All hotels
      </Link>

      <div className="atop" style={{ marginTop: 10 }}>
        <div>
          <div className="ah1">{hotel!.name}</div>
          <div className="asub">
            {hotel!.city} · {bookings.length} completed booking
            {bookings.length === 1 ? "" : "s"}
          </div>
        </div>
      </div>

      {saved && (
        <div
          style={{
            marginBottom: 18,
            padding: "10px 14px",
            background: "#e2efe7",
            color: "var(--emerald)",
            borderRadius: 10,
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          ✓ Payout updated.
        </div>
      )}
      {errorMessage && (
        <div
          style={{
            marginBottom: 18,
            padding: "10px 14px",
            background: "#fbe9e4",
            color: "var(--coral-d)",
            borderRadius: 10,
            fontWeight: 500,
            fontSize: 14,
          }}
        >
          {errorMessage}
        </div>
      )}

      <div className="kgrid" style={{ marginBottom: 22 }}>
        <Kpi label="Gross volume" big={fmt(totals.gross)} sub="Guest paid" money />
        <Kpi label="Offsite take" big={fmt(totals.take)} sub="12% service fee" money />
        <Kpi
          label="Owed to hotel"
          big={fmt(totals.netOwed)}
          sub="Net pending payout"
          money
        />
        <Kpi
          label="Paid out"
          big={fmt(totals.netPaid)}
          sub="Net already cleared"
          money
        />
      </div>

      <div className="panel">
        <h3>Completed bookings</h3>
        {bookings.length === 0 ? (
          <div className="empty">
            No completed bookings yet under this hotel.
          </div>
        ) : (
          bookings.map((b) => {
            const isPaid = b.payoutStatus === "PAID";
            return (
              <div key={b.id} className="trow">
                <div>
                  <div className="tmain">
                    {b.guestName}{" "}
                    <span style={{ color: "var(--muted)", fontWeight: 500 }}>
                      → {b.venue.name}
                    </span>
                  </div>
                  <div className="tsub">
                    {b.eventDate || "no date"} · created{" "}
                    {relativeTime(b.createdAt)}
                    {isPaid && b.payoutPaidAt
                      ? ` · paid ${relativeTime(b.payoutPaidAt)}`
                      : ""}
                  </div>
                </div>
                <div
                  className="tsp"
                  style={{ display: "flex", gap: 22, alignItems: "center" }}
                >
                  <Stat label="Gross" value={fmt(b.total ?? 0)} />
                  <Stat label="Take" value={fmt(b.serviceFee ?? 0)} />
                  <Stat
                    label="Net to hotel"
                    value={fmt(b.basePrice ?? 0)}
                    ok={isPaid}
                    warn={!isPaid}
                  />
                  <span
                    className={"pill " + (isPaid ? "done" : "req")}
                    style={{ minWidth: 64, textAlign: "center" }}
                  >
                    {isPaid ? "Paid" : "Pending"}
                  </span>
                  <form action={togglePayoutAction} style={{ display: "inline" }}>
                    <input type="hidden" name="id" value={b.id} />
                    <Link
                      href={`/admin/bookings/${b.id}`}
                      style={{
                        fontSize: 12,
                        color: "var(--muted)",
                        marginRight: 10,
                      }}
                    >
                      open ↗
                    </Link>
                    <button
                      type="submit"
                      className={isPaid ? "btn-warn" : "btn-emerald"}
                      style={{ fontSize: 13, padding: "8px 14px" }}
                    >
                      {isPaid ? "Mark pending" : "Mark paid"}
                    </button>
                  </form>
                </div>
              </div>
            );
          })
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
          fontSize: 15,
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
