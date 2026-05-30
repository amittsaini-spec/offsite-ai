import Link from "next/link";
import { prisma } from "@/lib/db";
import { parseDateArray, BLOCKING_STATUSES } from "@/lib/data";
import { updateVenueAvailabilityAction } from "@/lib/actions";
import BlackoutCalendar from "../_components/BlackoutCalendar";

export const dynamic = "force-dynamic";

export default async function Availability({
  searchParams,
}: {
  searchParams: Promise<{ venue?: string; saved?: string }>;
}) {
  const sp = await searchParams;

  // Side rail: all venues across all hotels for quick switching.
  const venues = await prisma.venue.findMany({
    include: { hotel: { select: { name: true, city: true } } },
    orderBy: [{ hotel: { name: "asc" } }, { name: "asc" }],
  });

  // Resolve which venue's calendar to render. If the URL has a stale or
  // missing ?venue param, default to the first venue so the calendar
  // surface is never empty when at least one venue exists.
  const selectedId = sp.venue ?? venues[0]?.id ?? null;
  const selected = selectedId
    ? await prisma.venue.findUnique({
        where: { id: selectedId },
        include: {
          hotel: { select: { name: true, city: true } },
          bookings: {
            where: { status: { in: BLOCKING_STATUSES } },
            select: { eventDate: true },
          },
        },
      })
    : null;

  const blackouts = selected ? parseDateArray(selected.blackoutDates) : [];
  const confirmedDates = selected
    ? Array.from(
        new Set(
          selected.bookings
            .map((b) => b.eventDate)
            .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)),
        ),
      )
    : [];

  return (
    <>
      <div className="atop">
        <div>
          <div className="ah1">Calendar</div>
          <div className="asub">
            Per-venue availability. Click a future date to toggle a blackout.
            CONFIRMED, DEPOSIT_HELD, and COMPLETED bookings are read-only.
          </div>
        </div>
        {sp.saved && <span className="savedchip">✓ Saved</span>}
      </div>

      <div className="availwrap">
        <div className="vrail">
          {venues.length === 0 ? (
            <div className="empty" style={{ padding: 28 }}>
              No venues yet.
            </div>
          ) : (
            venues.map((v) => (
              <Link
                key={v.id}
                href={`/admin/availability?venue=${v.id}`}
                className={v.id === selectedId ? "on" : ""}
              >
                <div className="vrname">{v.name}</div>
                <div className="vrsub">
                  {v.hotel.name} · {v.type}
                </div>
              </Link>
            ))
          )}
        </div>

        <div>
          {!selected ? (
            <div className="panel">
              <div className="empty">
                No venue selected. Add a venue first.
              </div>
            </div>
          ) : (
            <div className="panel" style={{ padding: 24 }}>
              <div style={{ marginBottom: 18 }}>
                <div
                  style={{
                    fontFamily: "'Fraunces',serif",
                    fontSize: 22,
                    fontWeight: 500,
                  }}
                >
                  {selected.name}
                </div>
                <div
                  style={{
                    fontSize: 13.5,
                    color: "var(--muted)",
                    marginTop: 2,
                  }}
                >
                  {selected.hotel.name} · {selected.hotel.city} · {selected.type}
                </div>
              </div>

              <form action={updateVenueAvailabilityAction}>
                <input type="hidden" name="id" value={selected.id} />
                <BlackoutCalendar
                  initialBlackouts={blackouts}
                  confirmedDates={confirmedDates}
                />
                <button
                  type="submit"
                  className="btn-emerald"
                  style={{ marginTop: 18 }}
                >
                  Save blackouts →
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
