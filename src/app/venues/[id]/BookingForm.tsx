"use client";

import { useState } from "react";
import { TIERS, quote, fmt } from "@/lib/data";
import { createBookingAction } from "@/lib/actions";

export default function BookingForm({
  venueId,
  basePrice,
  depositPct,
  rating,
}: {
  venueId: string;
  basePrice: number;
  depositPct: number;
  rating: string;
}) {
  const [tier, setTier] = useState(0);
  const q = quote(basePrice, TIERS[tier].mult, depositPct);

  return (
    <div className="book">
      <div className="bp">
        {fmt(q.base)} <span>/ {TIERS[tier].label.split("·")[0].trim()}</span>
      </div>
      <div style={{ fontSize: 13.5, color: "var(--muted)", marginTop: 6 }}>
        ★ {rating} · refundable hold reserves your date
      </div>

      <div
        style={{
          margin: "18px 0 8px",
          fontSize: 12.5,
          fontWeight: 700,
          letterSpacing: ".06em",
          textTransform: "uppercase",
          color: "var(--muted)",
        }}
      >
        Booking option
      </div>
      <div className="tiers">
        {TIERS.map((t, i) => (
          <div
            key={i}
            className={"tier" + (i === tier ? " on" : "")}
            onClick={() => setTier(i)}
          >
            <div>
              <div className="tn">{t.label}</div>
              <div className="td">{t.sub}</div>
            </div>
            <div className="tp">{fmt(quote(basePrice, t.mult, depositPct).base)}</div>
          </div>
        ))}
      </div>

      <form action={createBookingAction}>
        <input type="hidden" name="venueId" value={venueId} />
        <input type="hidden" name="tierIndex" value={tier} />

        <div className="btwo">
          <input className="binput" name="eventDate" type="date" required />
          <input
            className="binput"
            name="guests"
            type="number"
            min={1}
            defaultValue={120}
            placeholder="Guests"
            required
          />
        </div>
        <select className="binput" name="eventType" defaultValue="Wedding">
          <option>Wedding</option>
          <option>Corporate</option>
          <option>Birthday</option>
          <option>Social</option>
        </select>
        <input className="binput" name="guestName" placeholder="Your name" required />
        <input
          className="binput"
          name="guestEmail"
          type="email"
          placeholder="Email"
          required
        />

        <div className="bbreak">
          <div className="brow">
            <span>Venue fee</span>
            <span>{fmt(q.base)}</span>
          </div>
          <div className="brow">
            <span>Offsite service fee (12%)</span>
            <span>{fmt(q.serviceFee)}</span>
          </div>
          <div className="brow tot">
            <span>Total</span>
            <span>{fmt(q.total)}</span>
          </div>
        </div>

        <button className="bcta" type="submit">
          Reserve with {fmt(q.depositDue)} deposit
        </button>
        <div className="bnote">
          You won&apos;t be charged the balance until the hotel confirms. The deposit reserves your
          date.
        </div>
      </form>
    </div>
  );
}
