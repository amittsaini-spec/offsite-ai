"use client";

import { useState } from "react";
import { quote, fmt, type PricingOption } from "@/lib/data";
import { createBookingAction } from "@/lib/actions";

export default function BookingForm({
  venueId,
  pricingOptions,
  depositPct,
  rating,
}: {
  venueId: string;
  pricingOptions: PricingOption[];
  depositPct: number;
  rating: string;
}) {
  const [index, setIndex] = useState(0);
  const selected = pricingOptions[index] ?? pricingOptions[0];
  const q = quote(selected.price, depositPct);

  // Headline label: take what's before the "·" if present, else the whole label.
  const headline = selected.label.includes("·")
    ? selected.label.split("·")[0].trim()
    : selected.label;

  return (
    <div className="book">
      <div className="bp">
        {fmt(q.base)} <span>/ {headline}</span>
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
        {pricingOptions.map((o, i) => (
          <div
            key={i}
            className={"tier" + (i === index ? " on" : "")}
            onClick={() => setIndex(i)}
          >
            <div>
              <div className="tn">{o.label}</div>
              <div className="td">
                {o.durationHours > 0 ? `${o.durationHours}-hour block` : "Custom"}
              </div>
            </div>
            <div className="tp">{fmt(o.price)}</div>
          </div>
        ))}
      </div>

      <form action={createBookingAction}>
        <input type="hidden" name="venueId" value={venueId} />
        <input type="hidden" name="pricingOptionIndex" value={index} />

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
