import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  fmt,
  relativeTime,
  parseNotes,
  STATUS_TRANSITIONS,
  STATUS_PILL,
  STATUS_LABEL,
  STATUS_ACTION,
  type BookingStatus,
} from "@/lib/data";
import {
  setBookingStatusAction,
  addBookingNoteAction,
  postBookingMessageAction,
} from "@/lib/actions";

export const dynamic = "force-dynamic";

const ERROR_MESSAGES: Record<string, string> = {
  "invalid-transition":
    "That status change isn't allowed from the current state.",
};

export default async function BookingDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;

  const b = await prisma.bookingRequest.findUnique({
    where: { id },
    include: {
      venue: { include: { hotel: true } },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!b) notFound();

  const status = b!.status as BookingStatus;
  const notes = parseNotes(b!.notes);
  const validNextStates: BookingStatus[] = STATUS_TRANSITIONS[status] ?? [];
  const isDestructive = (s: BookingStatus) => s === "DECLINED" || s === "CANCELLED";
  const errorMessage = error ? ERROR_MESSAGES[error] ?? error : null;

  const createdLabel = b!.createdAt.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <>
      <Link href="/admin/bookings" className="back">
        ← All bookings
      </Link>

      <div className="atop" style={{ marginTop: 10 }}>
        <div>
          <div className="ah1">{b!.guestName}</div>
          <div className="asub">
            {b!.venue.name} at {b!.venue.hotel.name}
            {b!.eventDate && ` · Event on ${b!.eventDate}`}
          </div>
        </div>
        <span
          className={"pill " + STATUS_PILL[status]}
          style={{ fontSize: 13, padding: "8px 14px" }}
        >
          {STATUS_LABEL[status]}
        </span>
      </div>

      {errorMessage && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: 12,
            background: "#fbe9e4",
            color: "var(--coral-d)",
            fontWeight: 500,
            fontSize: 14,
            marginBottom: 18,
          }}
        >
          {errorMessage}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.4fr 1fr",
          gap: 22,
          alignItems: "start",
        }}
      >
        {/* ── Left column: read-only event + quote ──────────────────── */}
        <div>
          <div className="panel" style={{ marginBottom: 18 }}>
            <h3>Event</h3>
            <table className="kvtbl">
              <tbody>
                <tr>
                  <td>Event type</td>
                  <td>{b!.eventType}</td>
                </tr>
                <tr>
                  <td>Event date</td>
                  <td>{b!.eventDate || "—"}</td>
                </tr>
                <tr>
                  <td>Guests</td>
                  <td>{b!.guests.toLocaleString()}</td>
                </tr>
                <tr>
                  <td>Booked option</td>
                  <td>{b!.tierLabel}</td>
                </tr>
                <tr>
                  <td>Guest email</td>
                  <td>
                    <a
                      href={`mailto:${b!.guestEmail}`}
                      style={{ color: "var(--emerald)" }}
                    >
                      {b!.guestEmail}
                    </a>
                  </td>
                </tr>
                <tr>
                  <td>Venue</td>
                  <td>
                    <Link
                      href={`/admin/venues/${b!.venueId}/edit`}
                      style={{ color: "var(--emerald)", fontWeight: 600 }}
                    >
                      {b!.venue.name}
                    </Link>{" "}
                    ·{" "}
                    <Link
                      href={`/admin/hotels/${b!.venue.hotelId}`}
                      style={{ color: "var(--ink-2)" }}
                    >
                      {b!.venue.hotel.name}
                    </Link>{" "}
                    ·{" "}
                    <Link
                      href={`/venues/${b!.venueId}`}
                      target="_blank"
                      rel="noopener"
                      style={{ color: "var(--muted)", fontSize: 13 }}
                    >
                      Public page ↗
                    </Link>
                  </td>
                </tr>
                <tr>
                  <td>Created</td>
                  <td>
                    {createdLabel}{" "}
                    <span style={{ color: "var(--muted)" }}>
                      ({relativeTime(b!.createdAt)})
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="panel">
            <h3>Quote</h3>
            <table className="kvtbl">
              <tbody>
                <tr>
                  <td>Venue fee (net to hotel)</td>
                  <td>{fmt(b!.basePrice)}</td>
                </tr>
                <tr>
                  <td>Offsite service fee (12%)</td>
                  <td>{fmt(b!.serviceFee)}</td>
                </tr>
                <tr className="tot">
                  <td>Total guest paid</td>
                  <td>{fmt(b!.total)}</td>
                </tr>
                <tr>
                  <td>Deposit due now</td>
                  <td>{fmt(b!.depositDue)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Right column: actions + notes ────────────────────────── */}
        <div>
          <div className="panel" style={{ marginBottom: 18 }}>
            <h3>Status</h3>
            <div style={{ padding: 20 }}>
              <div className="asub" style={{ marginBottom: 14 }}>
                Current: <strong>{STATUS_LABEL[status]}</strong>
              </div>
              {validNextStates.length === 0 ? (
                <div
                  style={{
                    color: "var(--muted)",
                    fontSize: 13.5,
                    fontStyle: "italic",
                  }}
                >
                  Terminal state — no further transitions.
                </div>
              ) : (
                <div
                  style={{ display: "flex", gap: 10, flexWrap: "wrap" }}
                >
                  {validNextStates.map((next) => (
                    <form
                      key={next}
                      action={setBookingStatusAction}
                      style={{ display: "inline" }}
                    >
                      <input type="hidden" name="id" value={b!.id} />
                      <input type="hidden" name="status" value={next} />
                      <button
                        type="submit"
                        className={isDestructive(next) ? "btn-warn" : "btn-emerald"}
                      >
                        {STATUS_ACTION[next]}
                      </button>
                    </form>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="panel">
            <h3>
              Internal notes
              {notes.length > 0 && (
                <span style={{ color: "var(--muted)", fontWeight: 400 }}>
                  {" "}
                  ({notes.length})
                </span>
              )}
            </h3>
            <div style={{ padding: 20 }}>
              {notes.length === 0 ? (
                <div
                  style={{ color: "var(--muted)", fontSize: 13.5, marginBottom: 14 }}
                >
                  No notes yet. Use this for hotel callbacks, guest follow-ups, special requests.
                </div>
              ) : (
                <div>
                  {notes.map((n, i) => (
                    <div key={i} className="note">
                      <div className="note-meta">
                        {n.author} · {relativeTime(n.at)}
                      </div>
                      <div className="note-text">{n.text}</div>
                    </div>
                  ))}
                </div>
              )}

              <form action={addBookingNoteAction}>
                <input type="hidden" name="id" value={b!.id} />
                <textarea
                  name="text"
                  className="textarea"
                  required
                  placeholder="Add an internal note…"
                  style={{ minHeight: 70 }}
                />
                <button
                  type="submit"
                  className="btn-emerald"
                  style={{ marginTop: 10 }}
                >
                  Add note
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* ── Outward-facing message thread (full width) ─────────────── */}
      <div id="thread" className="panel" style={{ marginTop: 22, scrollMarginTop: 80 }}>
        <h3>
          Messages
          {b!.messages.length > 0 && (
            <span style={{ color: "var(--muted)", fontWeight: 400 }}>
              {" "}
              ({b!.messages.length})
            </span>
          )}
        </h3>
        <div style={{ padding: 22 }}>
          {b!.messages.length === 0 ? (
            <div
              style={{ color: "var(--muted)", fontSize: 13.5, marginBottom: 14 }}
            >
              No messages yet. Post one to start the conversation with{" "}
              {b!.guestName} (or to record what {b!.venue.hotel.name} said over
              the phone).
            </div>
          ) : (
            <div className="thread">
              {b!.messages.map((m) => {
                const sender = m.sender as "agent" | "guest" | "hotel";
                const label =
                  sender === "agent"
                    ? "You · Offsite"
                    : sender === "guest"
                      ? `${b!.guestName} · guest`
                      : `${b!.venue.hotel.name} · hotel`;
                return (
                  <div key={m.id} className={`msg msg-${sender}`}>
                    <div className="msg-meta">
                      <span className={`pill msg-pill-${sender}`}>
                        {sender.toUpperCase()}
                      </span>
                      <span className="msg-who">{label}</span>
                      <span className="msg-time">
                        {relativeTime(m.createdAt)}
                      </span>
                    </div>
                    <div className="msg-body">{m.body}</div>
                  </div>
                );
              })}
            </div>
          )}

          <form action={postBookingMessageAction} style={{ marginTop: 18 }}>
            <input type="hidden" name="id" value={b!.id} />
            <textarea
              name="body"
              className="textarea"
              required
              placeholder={`Reply to ${b!.guestName}…`}
              style={{ minHeight: 80 }}
            />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginTop: 10,
              }}
            >
              <button type="submit" className="btn-emerald">
                Post message →
              </button>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>
                Recorded as you (Offsite agent). Email notification to guest +
                hotel wires in here once the Resend integration is enabled.
              </span>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
