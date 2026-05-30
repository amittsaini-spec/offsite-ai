import { prisma } from "@/lib/db";
import { fmt } from "@/lib/data";
import { setBookingStatusAction } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function Bookings() {
  const bookings = await prisma.bookingRequest.findMany({
    include: { venue: { include: { hotel: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <div className="ah1">Booking requests</div>
      <div className="asub" style={{ marginBottom: 26 }}>
        Confirm with the hotel, then move the request forward. (Concierge-first — payments wire in
        here next.)
      </div>

      <div className="panel">
        <h3>{bookings.length} requests</h3>
        {bookings.length === 0 ? (
          <div className="empty">No booking requests yet.</div>
        ) : (
          bookings.map((b) => (
            <div key={b.id} className="trow">
              <div>
                <div className="tmain">
                  {b.venue.name} · {b.venue.hotel.name}
                </div>
                <div className="tsub">
                  {b.guestName} ({b.guestEmail}) · {b.eventType} · {b.eventDate || "no date"} ·{" "}
                  {b.guests} guests · {b.tierLabel}
                </div>
                <div className="tsub" style={{ marginTop: 4 }}>
                  Total {fmt(b.total)} · deposit {fmt(b.depositDue)} · Offsite fee{" "}
                  {fmt(b.serviceFee)}
                </div>
              </div>
              <div className="tsp" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span
                  className={
                    "pill " +
                    (b.status === "CONFIRMED" ? "ok" : b.status === "DECLINED" ? "no" : "req")
                  }
                >
                  {b.status}
                </span>
                {b.status === "REQUESTED" && (
                  <>
                    <form action={setBookingStatusAction}>
                      <input type="hidden" name="id" value={b.id} />
                      <input type="hidden" name="status" value="CONFIRMED" />
                      <button className="chip on" type="submit">
                        Confirm
                      </button>
                    </form>
                    <form action={setBookingStatusAction}>
                      <input type="hidden" name="id" value={b.id} />
                      <input type="hidden" name="status" value="DECLINED" />
                      <button className="chip" type="submit">
                        Decline
                      </button>
                    </form>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
