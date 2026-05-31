"use client";

import { useMemo, useState } from "react";
import { saveHomeSectionsAction } from "@/lib/actions";
import { VENUE_TYPES, KNOWN_TAGS } from "@/lib/data";

type FilterType = "tag" | "type" | "featured";
type Section = {
  id?: string;
  title: string;
  subtitle: string;
  filterType: FilterType;
  filterValue: string;
  enabled: boolean;
};

const EMPTY: Section = {
  title: "",
  subtitle: "",
  filterType: "tag",
  filterValue: "",
  enabled: true,
};

export default function HomeSectionsEditor({ initial }: { initial: Section[] }) {
  const [rows, setRows] = useState<Section[]>(
    initial.length > 0 ? initial : [{ ...EMPTY }],
  );

  const json = useMemo(() => JSON.stringify(rows), [rows]);

  function update(i: number, patch: Partial<Section>) {
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
    <form action={saveHomeSectionsAction} className="formcard">
      <input type="hidden" name="sections" value={json} />

      {rows.length === 0 && (
        <div className="empty" style={{ padding: 24, marginBottom: 14 }}>
          No sections yet.
        </div>
      )}

      {rows.map((row, i) => (
        <SectionRow
          key={i}
          index={i}
          row={row}
          update={(patch) => update(i, patch)}
          remove={() => remove(i)}
          up={() => move(i, -1)}
          down={() => move(i, 1)}
          isFirst={i === 0}
          isLast={i === rows.length - 1}
        />
      ))}

      <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
        <button type="button" onClick={add} className="btn-ghost">
          + Add section
        </button>
        <span style={{ flex: 1 }} />
        <button type="submit" className="btn-emerald">
          Save sections →
        </button>
      </div>
    </form>
  );
}

function SectionRow({
  index,
  row,
  update,
  remove,
  up,
  down,
  isFirst,
  isLast,
}: {
  index: number;
  row: Section;
  update: (p: Partial<Section>) => void;
  remove: () => void;
  up: () => void;
  down: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  // For "featured" the value field is moot — the public page just looks
  // for the Hot Pick tag. Hide / disable the input in that case so the
  // editor doesn't suggest typing something that won't be used.
  const showValue = row.filterType !== "featured";
  const options = row.filterType === "type" ? VENUE_TYPES : KNOWN_TAGS;

  return (
    <div
      style={{
        border: "1px solid var(--line)",
        borderRadius: 14,
        padding: 16,
        marginBottom: 12,
        background: "var(--sand-50)",
        opacity: row.enabled ? 1 : 0.6,
      }}
    >
      <div style={{ display: "flex", gap: 16 }}>
        <div style={{ flex: 1, display: "grid", gap: 10 }}>
          <div className="fgrid">
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Title</label>
              <input
                className="input"
                value={row.title}
                onChange={(e) => update({ title: e.target.value })}
                placeholder="Hot picks in Cancún"
              />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Subtitle</label>
              <input
                className="input"
                value={row.subtitle}
                onChange={(e) => update({ subtitle: e.target.value })}
                placeholder="The venues groups are reserving right now"
              />
            </div>
          </div>

          <div className="fgrid">
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Filter kind</label>
              <select
                className="input"
                value={row.filterType}
                onChange={(e) =>
                  update({
                    filterType: e.target.value as FilterType,
                    filterValue:
                      e.target.value === "featured" ? "" : row.filterValue,
                  })
                }
              >
                <option value="tag">Filter by tag</option>
                <option value="type">Filter by venue type</option>
                <option value="featured">Featured (Hot Pick)</option>
              </select>
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Value</label>
              <input
                className="input"
                value={row.filterValue}
                onChange={(e) => update({ filterValue: e.target.value })}
                placeholder={
                  row.filterType === "type" ? "Garden" : "Hot Pick"
                }
                list={`sectionv-${index}`}
                disabled={!showValue}
                style={{ opacity: showValue ? 1 : 0.5 }}
              />
              <datalist id={`sectionv-${index}`}>
                {options.map((v) => (
                  <option key={v} value={v} />
                ))}
              </datalist>
            </div>
          </div>

          <label
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13.5,
              color: "var(--ink-2)",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={row.enabled}
              onChange={(e) => update({ enabled: e.target.checked })}
            />
            Show on the public home page
          </label>
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
              onClick={up}
              disabled={isFirst}
              className="pill draft"
              style={{
                flex: 1,
                cursor: isFirst ? "not-allowed" : "pointer",
                opacity: isFirst ? 0.4 : 1,
              }}
              title="Move up"
            >
              ↑
            </button>
            <button
              type="button"
              onClick={down}
              disabled={isLast}
              className="pill draft"
              style={{
                flex: 1,
                cursor: isLast ? "not-allowed" : "pointer",
                opacity: isLast ? 0.4 : 1,
              }}
              title="Move down"
            >
              ↓
            </button>
          </div>
          <button
            type="button"
            onClick={remove}
            className="pill no"
            style={{ fontSize: 12 }}
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}
