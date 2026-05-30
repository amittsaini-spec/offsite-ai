"use client";

import { useMemo, useState } from "react";
import type { PricingOption } from "@/lib/data";

type Props = {
  initial: PricingOption[];
};

const EMPTY: PricingOption = { label: "", durationHours: 4, price: 0 };

// Dynamic list of pricing options. Serializes to a hidden `pricingOptions`
// JSON input the server action reads. 1+ rows; each row has its own remove.
export default function PricingOptionsEditor({ initial }: Props) {
  const [rows, setRows] = useState<PricingOption[]>(
    initial.length > 0 ? initial : [{ ...EMPTY, label: "Half-day · 4 hours" }],
  );

  const json = useMemo(
    () =>
      JSON.stringify(
        rows
          .map((r) => ({
            label: r.label.trim(),
            durationHours: Number(r.durationHours) || 0,
            price: Number(r.price) || 0,
          }))
          .filter((r) => r.label.length > 0 && r.price > 0),
      ),
    [rows],
  );

  function update(i: number, patch: Partial<PricingOption>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function add() {
    setRows((prev) => [...prev, { ...EMPTY }]);
  }
  function remove(i: number) {
    setRows((prev) => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== i)));
  }

  return (
    <div>
      <input type="hidden" name="pricingOptions" value={json} />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 110px 140px 80px",
          gap: 10,
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: ".04em",
          textTransform: "uppercase",
          color: "var(--muted)",
          padding: "0 4px 8px",
        }}
      >
        <div>Label</div>
        <div>Hours</div>
        <div>Price (USD)</div>
        <div />
      </div>

      {rows.map((r, i) => (
        <div
          key={i}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 110px 140px 80px",
            gap: 10,
            marginBottom: 8,
            alignItems: "center",
          }}
        >
          <input
            className="input"
            placeholder="Half-day · 4 hours"
            value={r.label}
            onChange={(e) => update(i, { label: e.target.value })}
          />
          <input
            className="input"
            type="number"
            min={0}
            step={0.5}
            value={r.durationHours}
            onChange={(e) => update(i, { durationHours: Number(e.target.value) })}
          />
          <input
            className="input"
            type="number"
            min={0}
            value={r.price}
            onChange={(e) => update(i, { price: Number(e.target.value) })}
          />
          <button
            type="button"
            onClick={() => remove(i)}
            disabled={rows.length === 1}
            className="pill no"
            style={{
              border: "none",
              cursor: rows.length === 1 ? "not-allowed" : "pointer",
              opacity: rows.length === 1 ? 0.4 : 1,
            }}
          >
            Remove
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={add}
        className="btn-ghost"
        style={{ marginTop: 8, fontSize: 13 }}
      >
        + Add option
      </button>
    </div>
  );
}
