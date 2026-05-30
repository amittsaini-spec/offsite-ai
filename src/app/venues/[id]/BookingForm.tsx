"use client";

import { useMemo, useState } from "react";
import { DayPicker } from "react-day-picker";
import { quote, fmt, fromYMD, toYMD, type PricingOption } from "@/lib/data";
import { createBookingAction } from "@/lib/actions";

export default function BookingForm({
  venueId,
  pricingOptions,
  depositPct,
  rating,
  unavailableDates,
}: {
  venueId: string;
  pricingOptions: PricingOption[];
  depositPct: number;
  rating: string;
  // Combined blackouts + CONFIRMED-booking dates (YYYY-MM-DD).
  unavailableDates: string[];
}) {
  const [index, setIndex] = useState(0);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const selected = pricingOptions[index] ?? pricingOptions[0];
  const q = quote(selected.price, depositPct);

  const headline = selected.label.includes("·")
    ? selected.label.split("·")[0].trim()
    : selected.label;

  const unavailable = useMemo(
    () => unavailableDates.map(fromYMD),
    [unavailableDates],
  );

  // Today at local midnight so the picker won't disable "today" itself.
  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  const formattedDate = date
    ? date.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Pick a date";

  return (
    <div className="book">
      <div className="bp">
        {fmt(q.base)} <span>/ {headline}</span>
      </div>
      <div style={{ fontSize: 13.5, color: "var(--muted)", marginTop: 6 }}>
        ★ {rating} · refundable hold reserves your date
      </div>

      <div className="bsec">Booking option</div>
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

      <div className="bsec">Pick a date</div>
      <div
        style={{
          fontSize: 13.5,
          color: date ? "var(--ink)" : "var(--muted)",
          fontWeight: date ? 600 : 500,
          marginBottom: 8,
        }}
      >
        {formattedDate}
      </div>
      <div className="bookcal">
        <DayPicker
          mode="single"
          selected={date}
          onSelect={setDate}
          disabled={[{ before: today }, ...unavailable]}
          numberOfMonths={1}
          weekStartsOn={0}
        />
      </div>

      <form action={createBookingAction}>
        <input type="hidden" name="venueId" value={venueId} />
        <input type="hidden" name="pricingOptionIndex" value={index} />
        <input
          type="hidden"
          name="eventDate"
          value={date ? toYMD(date) : ""}
        />

        <input
          className="binput"
          name="guests"
          type="number"
          min={1}
          defaultValue={120}
          placeholder="Guests"
          required
          style={{ marginTop: 14 }}
        />
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

        <button className="bcta" type="submit" disabled={!date}>
          {date
            ? `Reserve with ${fmt(q.depositDue)} deposit`
            : "Pick a date to reserve"}
        </button>
        <div className="bnote">
          You won&apos;t be charged the balance until the hotel confirms. The deposit reserves your
          date.
        </div>
      </form>
    </div>
  );
}
