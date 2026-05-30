import Link from "next/link";
import { prisma } from "@/lib/db";
import { fmt, STATUS_PILL, STATUS_LABEL, type BookingStatus } from "@/lib/data";
import { getDashboardStats, getMonthlyRevenue } from "@/lib/booking-stats";
import RevenueChart from "./_components/RevenueChart";
import StatusBreakdown from "./_components/StatusBreakdown";

export const dynamic = "force-dynamic";

export default async function Overview() {
  const [stats, revenueSeries, recentBookings] = await Promise.all([
    getDashboardStats(),
    getMonthlyRevenue(6),
    prisma.bookingRequest.findMany({
      include: { venue: { include: { hotel: true } } },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
  ]);

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

      {/* ── Recent bookings ────────────────────────────── */}
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
