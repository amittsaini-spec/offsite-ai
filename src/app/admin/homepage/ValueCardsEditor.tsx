"use client";

import { useMemo, useState } from "react";
import { saveValueCardsAction } from "@/lib/actions";
import type { ValueCard } from "@/lib/data";

const EMPTY: ValueCard = { figure: "", title: "", desc: "" };

export default function ValueCardsEditor({ initial }: { initial: ValueCard[] }) {
  const [rows, setRows] = useState<ValueCard[]>(
    initial.length > 0 ? initial : [{ ...EMPTY }],
  );

  const json = useMemo(() => JSON.stringify(rows), [rows]);

  function update(i: number, patch: Partial<ValueCard>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function add() {
    setRows((prev) => [...prev, { ...EMPTY }]);
  }
  function remove(i: number) {
    setRows((prev) => prev.filter((_, idx) => idx !== i));
  }
  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= rows.length) return;
    const next = [...rows];
    [next[i], next[j]] = [next[j], next[i]];
    setRows(next);
  }

  return (
    <form action={saveValueCardsAction} className="formcard">
      <input type="hidden" name="valueCards" value={json} />

      {rows.length === 0 && (
        <div className="empty" style={{ padding: 24, marginBottom: 14 }}>
          No value cards yet.
        </div>
      )}

      {rows.map((row, i) => (
        <div
          key={i}
          style={{
            border: "1px solid var(--line)",
            borderRadius: 14,
            padding: 16,
            marginBottom: 12,
            background: "var(--sand-50)",
          }}
        >
          <div style={{ display: "flex", gap: 16 }}>
            <div style={{ flex: 1, display: "grid", gap: 10 }}>
              <div className="fgrid">
                <div className="field" style={{ marginBottom: 0 }}>
                  <label>Figure</label>
                  <input
                    className="input"
                    value={row.figure}
                    onChange={(e) => update(i, { figure: e.target.value })}
                    placeholder="$0"
                  />
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label>Title</label>
                  <input
                    className="input"
                    value={row.title}
                    onChange={(e) => update(i, { title: e.target.value })}
                    placeholder="upfront for hotels"
                  />
                </div>
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Description</label>
                <textarea
                  className="textarea"
                  value={row.desc}
                  onChange={(e) => update(i, { desc: e.target.value })}
                  placeholder="We only earn a % when your venue books."
                  rows={2}
                  style={{ minHeight: 60 }}
                />
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                alignItems: "stretch",
                minWidth: 110,
              }}
            >
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  className="pill draft"
                  style={{
                    flex: 1,
                    cursor: i === 0 ? "not-allowed" : "pointer",
                    opacity: i === 0 ? 0.4 : 1,
                  }}
                  title="Move up"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === rows.length - 1}
                  className="pill draft"
                  style={{
                    flex: 1,
                    cursor: i === rows.length - 1 ? "not-allowed" : "pointer",
                    opacity: i === rows.length - 1 ? 0.4 : 1,
                  }}
                  title="Move down"
                >
                  ↓
                </button>
              </div>
              <button
                type="button"
                onClick={() => remove(i)}
                className="pill no"
                style={{ fontSize: 12 }}
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      ))}

      <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
        <button type="button" onClick={add} className="btn-ghost">
          + Add card
        </button>
        <span style={{ flex: 1 }} />
        <button type="submit" className="btn-emerald">
          Save value cards →
        </button>
      </div>
    </form>
  );
}
