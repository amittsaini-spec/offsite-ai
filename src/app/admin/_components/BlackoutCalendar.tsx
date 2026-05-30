"use client";

import { useMemo, useState } from "react";
import { DayPicker } from "react-day-picker";
import { fromYMD, toYMD } from "@/lib/data";

type Props = {
  initialBlackouts: string[]; // YYYY-MM-DD
  confirmedDates: string[]; // YYYY-MM-DD — read-only, shown as already-blocked
};

// Two-month calendar where the agent toggles dates that are blocked off
// (e.g. a property buyout, maintenance, or pre-sold-but-not-yet-confirmed).
// CONFIRMED bookings are surfaced inline so the agent sees the full picture,
// but those are read-only — the public booking flow already blocks them.
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
        disabled={{ before: new Date() }}
        modifiers={{
          blackout: blackoutDays,
          confirmed: confirmedDays,
        }}
        modifiersClassNames={{
          blackout: "rdp-blackout",
          confirmed: "rdp-confirmed",
        }}
        onDayClick={(day, modifiers) => {
          if (modifiers.disabled) return;
          toggle(day);
        }}
        className="rdp-admin"
      />

      <div
        style={{
          display: "flex",
          gap: 18,
          marginTop: 16,
          fontSize: 13,
          color: "var(--ink-2)",
          flexWrap: "wrap",
        }}
      >
        <Legend swatch="var(--coral)" label={`${blackouts.size} blackout date${blackouts.size === 1 ? "" : "s"}`} />
        <Legend
          swatch="var(--emerald)"
          label={`${confirmedDates.length} confirmed booking${confirmedDates.length === 1 ? "" : "s"} (read-only)`}
        />
      </div>
    </div>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <span
        style={{
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: swatch,
          display: "inline-block",
        }}
      />
      {label}
    </span>
  );
}
