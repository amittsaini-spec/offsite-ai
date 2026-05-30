"use client";

import { useMemo, useState } from "react";
import { uploadOne, BLOB_READY } from "@/app/_components/blobUpload";
import { saveHomeCollectionsAction } from "@/lib/actions";
import { VENUE_TYPES } from "@/lib/data";

type Card = {
  id?: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  linkType: "type" | "tag";
  linkValue: string;
};

// A small curated tag list mirrors what we already surface on the browse
// page so editors can pick from familiar values without typing exact
// strings. Free text still works via "Other" since the input is just a
// dropdown bound to an input via datalist.
const KNOWN_TAGS = [
  "Hot Pick",
  "Garden Venues",
  "Beachfront",
  "Oceanfront",
  "Rooftop",
  "Ballroom",
  "Chapel",
  "Value",
] as const;

const EMPTY: Card = {
  title: "",
  subtitle: "",
  imageUrl: "",
  linkType: "type",
  linkValue: "",
};

export default function HomeCollectionsEditor({ initial }: { initial: Card[] }) {
  const [rows, setRows] = useState<Card[]>(
    initial.length > 0 ? initial : [{ ...EMPTY }],
  );

  const json = useMemo(() => JSON.stringify(rows), [rows]);

  function update(i: number, patch: Partial<Card>) {
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
    <form action={saveHomeCollectionsAction} className="formcard">
      <input type="hidden" name="collections" value={json} />

      {rows.length === 0 && (
        <div className="empty" style={{ padding: 24, marginBottom: 14 }}>
          No collection cards yet.
        </div>
      )}

      {rows.map((row, i) => (
        <CollectionRow
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
          + Add card
        </button>
        <span style={{ flex: 1 }} />
        <button type="submit" className="btn-emerald">
          Save Shop by Moment →
        </button>
      </div>
    </form>
  );
}

function CollectionRow({
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
  row: Card;
  update: (p: Partial<Card>) => void;
  remove: () => void;
  up: () => void;
  down: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onPick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setErr(null);
    try {
      const url = await uploadOne(file, "home/collections");
      update({ imageUrl: url });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        border: "1px solid var(--line)",
        borderRadius: 14,
        padding: 16,
        marginBottom: 12,
        background: "var(--sand-50)",
      }}
    >
      <div style={{ display: "flex", gap: 16 }}>
        {/* Thumbnail */}
        <div style={{ width: 140, flexShrink: 0 }}>
          <div
            style={{
              width: 140,
              aspectRatio: "4/3",
              borderRadius: 10,
              border: "1px solid var(--line)",
              background: row.imageUrl
                ? `#000 url(${row.imageUrl}) center/cover no-repeat`
                : "var(--sand-100)",
              marginBottom: 8,
            }}
          />
          <label
            style={{
              display: "inline-block",
              padding: "6px 12px",
              border: "1px dashed var(--line)",
              borderRadius: 8,
              cursor: busy ? "wait" : "pointer",
              fontSize: 12,
              color: "var(--ink-2)",
              opacity: !BLOB_READY ? 0.5 : 1,
            }}
          >
            {busy ? "Uploading…" : row.imageUrl ? "Replace" : "+ Image"}
            <input
              type="file"
              accept="image/*"
              disabled={busy || !BLOB_READY}
              onChange={(e) => onPick(e.target.files?.[0])}
              style={{ display: "none" }}
            />
          </label>
          {row.imageUrl && (
            <button
              type="button"
              onClick={() => update({ imageUrl: "" })}
              className="pill no"
              style={{ marginLeft: 6, fontSize: 11 }}
            >
              Clear
            </button>
          )}
          {err && (
            <div style={{ color: "var(--coral-d)", fontSize: 12, marginTop: 6 }}>
              {err}
            </div>
          )}
        </div>

        {/* Fields */}
        <div style={{ flex: 1, display: "grid", gap: 10 }}>
          <div className="fgrid">
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Eyebrow (small text)</label>
              <input
                className="input"
                value={row.title}
                onChange={(e) => update({ title: e.target.value })}
                placeholder="For the ceremony"
              />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Title (large text)</label>
              <input
                className="input"
                value={row.subtitle}
                onChange={(e) => update({ subtitle: e.target.value })}
                placeholder="Garden Ceremonies"
              />
            </div>
          </div>

          <div className="fgrid">
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Link kind</label>
              <select
                className="input"
                value={row.linkType}
                onChange={(e) =>
                  update({
                    linkType: e.target.value === "tag" ? "tag" : "type",
                    linkValue: "",
                  })
                }
              >
                <option value="type">Filter by venue type</option>
                <option value="tag">Filter by tag</option>
              </select>
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Value</label>
              <input
                className="input"
                value={row.linkValue}
                onChange={(e) => update({ linkValue: e.target.value })}
                placeholder={row.linkType === "type" ? "Garden" : "Hot Pick"}
                list={`linkv-${index}`}
              />
              <datalist id={`linkv-${index}`}>
                {(row.linkType === "type" ? VENUE_TYPES : KNOWN_TAGS).map((v) => (
                  <option key={v} value={v} />
                ))}
              </datalist>
            </div>
          </div>
        </div>

        {/* Actions column */}
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
            title="Remove card"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}
