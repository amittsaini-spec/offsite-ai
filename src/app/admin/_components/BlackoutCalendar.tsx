"use client";

import { useMemo, useState } from "react";
import { DayPicker, DayButton as RDPDayButton } from "react-day-picker";
import { fromYMD, toYMD } from "@/lib/data";

type Props = {
  initialBlackouts: string[]; // YYYY-MM-DD
  confirmedDates: string[]; // YYYY-MM-DD — read-only, shown as already-blocked
};

// Two-month calendar where the agent toggles dates that are blocked off
// (e.g. a property buyout, maintenance, or pre-sold-but-not-yet-confirmed).
// CONFIRMED bookings are surfaced inline so the agent sees the full picture,
// but those are read-only — the public booking flow already blocks them.
//
// Color coding mirrors the public calendar:
//   green tint  → Open
//   coral fill  → Blackout (admin-toggled)
//   emerald ring → Booked (CONFIRMED / DEPOSIT_HELD / COMPLETED)
export default function BlackoutCalendar({ initialBlackouts, confirmedDates }: Props) {
  const [blackouts, setBlackouts] = useState<Set<string>>(
    () => new Set(initialBlackouts),
  );

  const confirmedSet = useMemo(() => new Set(confirmedDates), [confirmedDates]);
  const blackoutDays = useMemo(
    () => Array.from(blackouts).map(fromYMD),
    [blackouts],
  );
  const confirmedDays = useMemo(
    () => confirmedDates.map(fromYMD),
    [confirmedDates],
  );

  // Today at local midnight so matchers compare cleanly.
  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  // Any future date that's neither toggled-blackout nor a real booking is "Open".
  const openMatcher = useMemo(
    () => (d: Date) => {
      if (d < today) return false;
      const ymd = toYMD(d);
      return !blackouts.has(ymd) && !confirmedSet.has(ymd);
    },
    [today, blackouts, confirmedSet],
  );

  function toggle(day: Date) {
    const ymd = toYMD(day);
    if (confirmedSet.has(ymd)) return; // read-only
    setBlackouts((prev) => {
      const next = new Set(prev);
      if (next.has(ymd)) next.delete(ymd);
      else next.add(ymd);
      return next;
    });
  }

  const json = useMemo(
    () => JSON.stringify(Array.from(blackouts).sort()),
    [blackouts],
  );

  return (
    <div>
      <input type="hidden" name="blackoutDates" value={json} />

      <DayPicker
        mode="single"
        numberOfMonths={2}
        weekStartsOn={0}
        disabled={{ before: today }}
        modifiers={{
          open: openMatcher,
          blackout: blackoutDays,
          confirmed: confirmedDays,
        }}
        modifiersClassNames={{
          open: "rdp-mod-open",
          blackout: "rdp-blackout",
          confirmed: "rdp-confirmed",
        }}
        onDayClick={(day, modifiers) => {
          if (modifiers.disabled) return;
          toggle(day);
        }}
        components={{
          DayButton: (props) => {
            const { modifiers } = props;
            const title = modifiers.confirmed
              ? "Booked"
              : modifiers.blackout
                ? "Blackout"
                : modifiers.open
                  ? "Open"
                  : "";
            return <RDPDayButton {...props} title={title} />;
          },
        }}
        className="rdp-admin"
      />

      <div className="callegend" style={{ marginTop: 16 }}>
        <span className="callegend-item">
          <span className="callegend-sw callegend-sw-avail" /> Open
        </span>
        <span className="callegend-item">
          <span className="callegend-sw callegend-sw-blackout" /> Blackout
        </span>
        <span className="callegend-item">
          <span className="callegend-sw callegend-sw-booked" /> Booked (read-only)
        </span>
        <span className="callegend-item">
          <span className="callegend-sw callegend-sw-today" /> Today
        </span>
      </div>

      <div
        style={{
          display: "flex",
          gap: 18,
          marginTop: 12,
          fontSize: 13,
          color: "var(--ink-2)",
          flexWrap: "wrap",
        }}
      >
        <span>
          <strong>{blackouts.size}</strong> blackout date
          {blackouts.size === 1 ? "" : "s"}
        </span>
        <span>
          <strong>{confirmedDates.length}</strong> confirmed booking
          {confirmedDates.length === 1 ? "" : "s"} (read-only)
        </span>
      </div>
    </div>
  );
}
