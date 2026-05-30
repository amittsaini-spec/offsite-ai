// Shared aggregations for the Overview dashboard and Revenue page.
// Centralized so KPI math and chart bucketing can't drift apart.

import { prisma } from "./db";
import { BOOKING_STATUSES, type BookingStatus } from "./data";

export type StatusCounts = Record<BookingStatus, number>;

// All booking-level KPIs for the Overview cards.
export async function getDashboardStats() {
  const [hotelCount, totalVenues, liveVenues, statusGroups, sumPipeline, sumRealizedNet, sumRealizedTake] =
    await Promise.all([
      prisma.hotel.count(),
      prisma.venue.count(),
      prisma.venue.count({ where: { status: "PUBLISHED" } }),
      prisma.bookingRequest.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      prisma.bookingRequest.aggregate({
        _sum: { total: true },
        where: { status: { in: ["REQUESTED", "CONFIRMED", "DEPOSIT_HELD"] } },
      }),
      prisma.bookingRequest.aggregate({
        _sum: { basePrice: true },
        where: { status: "COMPLETED" },
      }),
      prisma.bookingRequest.aggregate({
        _sum: { serviceFee: true },
        where: { status: "COMPLETED" },
      }),
    ]);

  const counts: StatusCounts = {
    REQUESTED: 0,
    CONFIRMED: 0,
    DEPOSIT_HELD: 0,
    COMPLETED: 0,
    DECLINED: 0,
    CANCELLED: 0,
  };
  for (const g of statusGroups) {
    if ((BOOKING_STATUSES as readonly string[]).includes(g.status)) {
      counts[g.status as BookingStatus] = g._count._all;
    }
  }

  const totalBookings = Object.values(counts).reduce((a, b) => a + b, 0);
  const inProgress = counts.REQUESTED + counts.CONFIRMED + counts.DEPOSIT_HELD;
  const won = counts.CONFIRMED + counts.DEPOSIT_HELD + counts.COMPLETED;
  const cancelledOrDeclined = counts.DECLINED + counts.CANCELLED;
  // Conversion = won bookings as a share of all "real" leads (exclude cancelled).
  const conversionDenom = totalBookings - cancelledOrDeclined + counts.DECLINED;
  const conversionRate = conversionDenom > 0 ? won / conversionDenom : 0;

  return {
    hotelCount,
    totalVenues,
    liveVenues,
    statusCounts: counts,
    openRequests: counts.REQUESTED,
    inProgress,
    completed: counts.COMPLETED,
    pipelineValue: sumPipeline._sum.total ?? 0,
    realizedGross: sumRealizedNet._sum.basePrice ?? 0,
    realizedTake: sumRealizedTake._sum.serviceFee ?? 0,
    conversionRate,
  };
}

// Monthly revenue series for the line chart. We bucket by calendar month
// using the booking createdAt (the request date), summing only realized
// COMPLETED bookings so the chart reflects money in the bank.
export async function getMonthlyRevenue(months = 6) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

  const bookings = await prisma.bookingRequest.findMany({
    where: {
      status: "COMPLETED",
      createdAt: { gte: start },
    },
    select: { createdAt: true, basePrice: true, serviceFee: true, total: true },
  });

  // Pre-fill buckets so empty months still render.
  const buckets: { key: string; label: string; gross: number; take: number }[] = [];
  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - (months - 1) + i, 1);
    buckets.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleString(undefined, { month: "short" }),
      gross: 0,
      take: 0,
    });
  }
  const byKey = new Map(buckets.map((b) => [b.key, b]));

  for (const b of bookings) {
    const d = b.createdAt;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const bucket = byKey.get(key);
    if (!bucket) continue;
    bucket.gross += b.total ?? 0;
    bucket.take += b.serviceFee ?? 0;
  }

  return buckets;
}
