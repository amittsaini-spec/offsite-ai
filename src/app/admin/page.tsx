import Link from "next/link";
import { prisma } from "@/lib/db";
import {
  fmt,
  STATUS_PILL,
  STATUS_LABEL,
  venueHealth,
  healthTier,
  type BookingStatus,
} from "@/lib/data";
import { getDashboardStats, getMonthlyRevenue } from "@/lib/booking-stats";
import RevenueChart from "./_components/RevenueChart";
import StatusBreakdown from "./_components/StatusBreakdown";

export const dynamic = "force-dynamic";

const ATTN_LIMIT = 5;

export default async function Overview() {
  const [stats, revenueSeries, recentBookings, allVenues] = await Promise.all([
    getDashboardStats(),
    getMonthlyRevenue(6),
    prisma.bookingRequest.findMany({
      include: { venue: { include: { hotel: true } } },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.venue.findMany({
      include: { hotel: { select: { name: true } } },
    }),
  ]);

  // Listings needing attention: venues with completeness < 100, lowest
  // scores first. Capped to ATTN_LIMIT so the panel stays scannable.
  const needsAttention = allVenues
    .map((v) => ({ v, h: venueHealth(v) }))
    .filter((x) => x.h.score < 100)
    .sort((a, b) => a.h.score - b.h.score)
    .slice(0, ATTN_LIMIT);

  return (
    <>
      <div className="atop">
        <div>
          <div className="ah1">Overview</div>
          <div className="asub">Everything you manage on the hotels&apos; behalf.</div>
        </div>
        <Link href="/admin/hotels/new" className="btn-emerald">
          + New hotel
        </Link>
      </div>

      {/* ── Headline KPIs ─────────────────────────────── */}
      <div className="kgrid">
        <Kpi
          label="Venues live"
          big={`${stats.liveVenues}`}
          sub={`of ${stats.totalVenues} total across ${stats.hotelCount} hotels`}
        />
        <Kpi
          label="Open requests"
          big={`${stats.openRequests}`}
          sub={`${stats.inProgress} in progress`}
        />
        <Kpi
          label="Confirmed bookings"
          big={`${stats.statusCounts.CONFIRMED + stats.statusCounts.DEPOSIT_HELD + stats.completed}`}
          sub={`${stats.completed} completed`}
        />
        <Kpi
          label="Conversion"
          big={`${Math.round(stats.conversionRate * 100)}%`}
          sub="of non-cancelled leads"
        />
      </div>

      <div className="kgrid">
        <Kpi label="Pipeline value" big={fmt(stats.pipelineValue)} sub="REQUESTED + CONFIRMED + DEPOSIT_HELD" money />
        <Kpi label="Realized gross" big={fmt(stats.realizedGross)} sub="Net to hotels (COMPLETED)" money />
        <Kpi label="Offsite take" big={fmt(stats.realizedTake)} sub="12% service fee (COMPLETED)" money />
        <Kpi
          label="Cancellations"
          big={`${stats.statusCounts.DECLINED + stats.statusCounts.CANCELLED}`}
          sub={`${stats.statusCounts.DECLINED} declined · ${stats.statusCounts.CANCELLED} cancelled`}
        />
      </div>

      {/* ── Charts ──────────────────────────────────────── */}
      <div className="chartrow">
        <div className="chartwrap">
          <h3>Revenue (last 6 months)</h3>
          <div className="sub">Gross volume and Offsite take per month, from COMPLETED bookings.</div>
          <RevenueChart data={revenueSeries} />
        </div>
        <div className="chartwrap">
          <h3>Bookings by status</h3>
          <div className="sub">All bookings ever, by their current status.</div>
          <StatusBreakdown counts={stats.statusCounts} />
        </div>
      </div>

      {/* ── Recent bookings + Listings needing attention ───────────── */}
      <div className="chartrow">
        <div className="panel">
          <h3>Recent bookings</h3>
          {recentBookings.length === 0 ? (
            <div className="empty">No bookings yet.</div>
          ) : (
            recentBookings.map((b) => {
              const status = b.status as BookingStatus;
              return (
                <Link key={b.id} href={`/admin/bookings/${b.id}`} className="trow">
                  <div>
                    <div className="tmain">{b.venue.name}</div>
                    <div className="tsub">
                      {b.guestName} · {fmt(b.total)} · {b.eventDate || "no date"}
                    </div>
                  </div>
                  <span className={"tsp pill " + (STATUS_PILL[status] ?? "draft")}>
                    {STATUS_LABEL[status] ?? b.status}
                  </span>
                </Link>
              );
            })
          )}
        </div>

        <div className="panel">
          <h3>
            Listings needing attention
            {needsAttention.length > 0 && (
              <span style={{ color: "var(--muted)", fontWeight: 400 }}>
                {" "}
                ({needsAttention.length})
              </span>
            )}
          </h3>
          {needsAttention.length === 0 ? (
            <div className="empty">All listings are 100% complete. 🎉</div>
          ) : (
            needsAttention.map(({ v, h }) => {
              const tier = healthTier(h.score);
              // Show up to 3 missing items inline; the badge tooltip has the
              // full list. Comma-joined so the row stays compact.
              const top = h.missing.slice(0, 3).map((m) => m.label);
              return (
                <Link
                  key={v.id}
                  href={`/admin/venues/${v.id}/edit`}
                  className="attn-row"
                >
                  <div className="attn-main">
                    <div className="attn-name">
                      {v.name}{" "}
                      <span style={{ color: "var(--muted)", fontWeight: 500 }}>
                        — {v.hotel.name}
                      </span>
                    </div>
                    <div className="attn-missing">
                      <strong>To do:</strong> {top.join(" · ")}
                      {h.missing.length > top.length && " …"}
                    </div>
                  </div>
                  <span className={`hb-pill hb-${tier}`} style={{ flexShrink: 0 }}>
                    {h.score}%
                  </span>
                </Link>
              );
            })
          )}
        </div>
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
      <div className="sn">{big}</div>
      <div className="sl">{label}</div>
      <div className="ss">{sub}</div>
    </div>
  );
}
