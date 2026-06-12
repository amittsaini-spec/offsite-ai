// Scatters DEMO blackout dates across every PUBLISHED venue so the public
// availability calendars look populated during pre-launch demos.
//
//   tsx prisma/seed-demo-blackouts.ts          # add demo blackouts
//   tsx prisma/seed-demo-blackouts.ts --clear  # wipe ONLY the demo dates we added
//
// Every date this script writes is recorded in prisma/demo-blackouts.json.
// `--clear` reads that file and removes exactly those dates from each
// venue's blackoutDates, leaving any real (agent-toggled) blackouts in
// place. Wiping is a single command — safe to run before real launch.

import { PrismaClient } from "@prisma/client";
import { readFileSync, writeFileSync, existsSync, unlinkSync } from "node:fs";
import { join } from "node:path";

const prisma = new PrismaClient();
const TRACK_PATH = join(process.cwd(), "prisma", "demo-blackouts.json");

// How many random dates to scatter per venue, picked in the next 90 days.
const DATES_PER_VENUE_MIN = 6;
const DATES_PER_VENUE_MAX = 12;
const WINDOW_DAYS = 90;

type TrackFile = {
  generatedAt: string;
  note: string;
  venues: { venueId: string; venueName: string; dates: string[] }[];
};

function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseBlackouts(s: string): string[] {
  try {
    const v = JSON.parse(s);
    return Array.isArray(v)
      ? v.map((x) => String(x ?? "").trim()).filter((x) => /^\d{4}-\d{2}-\d{2}$/.test(x))
      : [];
  } catch {
    return [];
  }
}

function pickRandomDates(count: number, exclude: Set<string>): string[] {
  const out = new Set<string>();
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  let attempts = 0;
  while (out.size < count && attempts < count * 10) {
    attempts++;
    // Skip "today" itself so today is still selectable in the demo.
    const offset = 1 + Math.floor(Math.random() * WINDOW_DAYS);
    const d = new Date(base);
    d.setDate(d.getDate() + offset);
    const ymd = toYMD(d);
    if (exclude.has(ymd)) continue;
    out.add(ymd);
  }
  return Array.from(out).sort();
}

async function add() {
  if (existsSync(TRACK_PATH)) {
    console.error(
      `\n  Demo blackouts already present (see ${TRACK_PATH}).\n  Run with --clear first, then re-seed.\n`,
    );
    process.exit(1);
  }

  const venues = await prisma.venue.findMany({
    where: { status: "PUBLISHED" },
    select: { id: true, name: true, blackoutDates: true },
    orderBy: { name: "asc" },
  });
  if (venues.length === 0) {
    console.log("No PUBLISHED venues found — nothing to seed.");
    return;
  }

  const track: TrackFile = {
    generatedAt: new Date().toISOString(),
    note: "DEMO data. Run `npm run db:clear-demo-blackouts` to wipe.",
    venues: [],
  };

  for (const v of venues) {
    const existing = new Set(parseBlackouts(v.blackoutDates));
    const count =
      DATES_PER_VENUE_MIN +
      Math.floor(Math.random() * (DATES_PER_VENUE_MAX - DATES_PER_VENUE_MIN + 1));
    const picks = pickRandomDates(count, existing);
    if (picks.length === 0) continue;

    const merged = Array.from(new Set([...existing, ...picks])).sort();
    await prisma.venue.update({
      where: { id: v.id },
      data: { blackoutDates: JSON.stringify(merged) },
    });

    track.venues.push({ venueId: v.id, venueName: v.name, dates: picks });
    console.log(`  + ${v.name} — ${picks.length} demo dates`);
  }

  writeFileSync(TRACK_PATH, JSON.stringify(track, null, 2));
  console.log(
    `\n  Wrote ${track.venues.length} venue entries to ${TRACK_PATH}\n  Wipe with: npm run db:clear-demo-blackouts\n`,
  );
}

async function clear() {
  if (!existsSync(TRACK_PATH)) {
    console.log(`No demo tracker at ${TRACK_PATH} — nothing to clear.`);
    return;
  }
  const track = JSON.parse(readFileSync(TRACK_PATH, "utf8")) as TrackFile;

  let totalRemoved = 0;
  for (const entry of track.venues) {
    const v = await prisma.venue.findUnique({
      where: { id: entry.venueId },
      select: { blackoutDates: true, name: true },
    });
    if (!v) continue;
    const demoSet = new Set(entry.dates);
    const kept = parseBlackouts(v.blackoutDates).filter((d) => !demoSet.has(d));
    await prisma.venue.update({
      where: { id: entry.venueId },
      data: { blackoutDates: JSON.stringify(kept.sort()) },
    });
    totalRemoved += entry.dates.length;
    console.log(`  − ${v.name} — removed ${entry.dates.length}`);
  }

  unlinkSync(TRACK_PATH);
  console.log(`\n  Removed ${totalRemoved} demo dates across ${track.venues.length} venues.\n`);
}

async function main() {
  const mode = process.argv.includes("--clear") ? "clear" : "add";
  if (mode === "clear") await clear();
  else await add();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
