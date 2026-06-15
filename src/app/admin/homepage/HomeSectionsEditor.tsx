"use client";

import { useMemo, useState } from "react";
import { saveHomeSectionsAction } from "@/lib/actions";
import { VENUE_TYPES, KNOWN_TAGS } from "@/lib/data";

type FilterType = "tag" | "type" | "featured";
type SelectionMode = "auto" | "manual";

type Section = {
  id?: string;
  title: string;
  subtitle: string;
  selectionMode: SelectionMode;
  filterType: FilterType;
  filterValue: string;
  featuredVenueIds: string[];
  enabled: boolean;
};

export type VenueOption = {
  id: string;
  name: string;
  type: string;
  hotelName: string;
  city: string;
};

const EMPTY: Section = {
  title: "",
  subtitle: "",
  selectionMode: "auto",
  filterType: "tag",
  filterValue: "",
  featuredVenueIds: [],
  enabled: true,
};

export default function HomeSectionsEditor({
  initial,
  venues,
}: {
  initial: Section[];
  venues: VenueOption[];
}) {
  const [rows, setRows] = useState<Section[]>(
    initial.length > 0 ? initial : [{ ...EMPTY }],
  );

  const json = useMemo(() => JSON.stringify(rows), [rows]);
  const venueById = useMemo(() => {
    const m = new Map<string, VenueOption>();
    for (const v of venues) m.set(v.id, v);
    return m;
  }, [venues]);

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
          venues={venues}
          venueById={venueById}
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
  venues,
  venueById,
  update,
  remove,
  up,
  down,
  isFirst,
  isLast,
}: {
  index: number;
  row: Section;
  venues: VenueOption[];
  venueById: Map<string, VenueOption>;
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
  const isManual = row.selectionMode === "manual";

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

          <div className="field" style={{ marginBottom: 0 }}>
            <label>How venues are chosen</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <ModeChip
                active={!isManual}
                onClick={() => update({ selectionMode: "auto" })}
                label="Auto — filter by tag/type"
              />
              <ModeChip
                active={isManual}
                onClick={() => update({ selectionMode: "manual" })}
                label="Manual — hand-pick venues"
              />
            </div>
          </div>

          {!isManual && (
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
          )}

          {isManual && (
            <ManualPicker
              index={index}
              selectedIds={row.featuredVenueIds}
              venues={venues}
              venueById={venueById}
              onChange={(ids) => update({ featuredVenueIds: ids })}
            />
          )}

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

function ModeChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="fchip"
      style={{
        cursor: "pointer",
        background: active ? "var(--emerald)" : undefined,
        color: active ? "#fff" : undefined,
        borderColor: active ? "var(--emerald)" : undefined,
        fontWeight: active ? 600 : undefined,
      }}
    >
      {label}
    </button>
  );
}

function ManualPicker({
  index,
  selectedIds,
  venues,
  venueById,
  onChange,
}: {
  index: number;
  selectedIds: string[];
  venues: VenueOption[];
  venueById: Map<string, VenueOption>;
  onChange: (ids: string[]) => void;
}) {
  const [query, setQuery] = useState("");

  const selected = selectedIds
    .map((id) => venueById.get(id))
    .filter((v): v is VenueOption => Boolean(v));

  const selectedSet = new Set(selectedIds);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return venues
      .filter((v) => !selectedSet.has(v.id))
      .filter((v) => {
        return (
          v.name.toLowerCase().includes(q) ||
          v.hotelName.toLowerCase().includes(q) ||
          v.city.toLowerCase().includes(q) ||
          v.type.toLowerCase().includes(q)
        );
      })
      .slice(0, 8);
  }, [query, venues, selectedSet]);

  function addId(id: string) {
    if (selectedSet.has(id)) return;
    onChange([...selectedIds, id]);
    setQuery("");
  }
  function removeId(id: string) {
    onChange(selectedIds.filter((x) => x !== id));
  }
  function moveId(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= selectedIds.length) return;
    const next = [...selectedIds];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }

  return (
    <div
      style={{
        border: "1px dashed var(--line)",
        borderRadius: 12,
        padding: 14,
        background: "#fff",
        display: "grid",
        gap: 10,
      }}
    >
      <div className="field" style={{ marginBottom: 0, position: "relative" }}>
        <label>Add venues</label>
        <input
          className="input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by venue or hotel name…"
          autoComplete="off"
        />
        {matches.length > 0 && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              marginTop: 4,
              background: "#fff",
              border: "1px solid var(--line)",
              borderRadius: 10,
              boxShadow: "0 10px 24px rgba(0,0,0,0.08)",
              zIndex: 5,
              overflow: "hidden",
            }}
          >
            {matches.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => addId(v.id)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "10px 12px",
                  background: "transparent",
                  border: 0,
                  borderBottom: "1px solid var(--line)",
                  cursor: "pointer",
                  fontSize: 13.5,
                }}
              >
                <div style={{ fontWeight: 600, color: "var(--ink)" }}>
                  {v.name}
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>
                  {v.type} · {v.hotelName}
                  {v.city ? ` · ${v.city}` : ""}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <div
          style={{
            fontSize: 12,
            color: "var(--muted)",
            marginBottom: 6,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: 0.4,
          }}
        >
          Featured venues ({selected.length})
        </div>

        {selected.length === 0 && (
          <div
            className="empty"
            style={{ padding: 14, fontSize: 13, color: "var(--muted)" }}
          >
            No venues picked yet — search above to add some.
          </div>
        )}

        {selected.length > 0 && (
          <div style={{ display: "grid", gap: 6 }}>
            {selected.map((v, i) => (
              <div
                key={`${index}-${v.id}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 10px",
                  border: "1px solid var(--line)",
                  borderRadius: 10,
                  background: "var(--sand-50)",
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    color: "var(--muted)",
                    minWidth: 18,
                    textAlign: "center",
                  }}
                >
                  {i + 1}.
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13.5,
                      fontWeight: 600,
                      color: "var(--ink)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {v.name}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--muted)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {v.type} · {v.hotelName}
                    {v.city ? ` · ${v.city}` : ""}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => moveId(i, -1)}
                  disabled={i === 0}
                  className="pill draft"
                  style={{
                    cursor: i === 0 ? "not-allowed" : "pointer",
                    opacity: i === 0 ? 0.4 : 1,
                    fontSize: 12,
                  }}
                  title="Move up"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => moveId(i, 1)}
                  disabled={i === selected.length - 1}
                  className="pill draft"
                  style={{
                    cursor:
                      i === selected.length - 1 ? "not-allowed" : "pointer",
                    opacity: i === selected.length - 1 ? 0.4 : 1,
                    fontSize: 12,
                  }}
                  title="Move down"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => removeId(v.id)}
                  className="pill no"
                  style={{ fontSize: 12 }}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
