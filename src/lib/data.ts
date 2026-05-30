// Shared constants + pure helpers used across server and client components.

// DEMO: hide venues with no uploaded photos from the public marketplace
// (home + /venues browse). Set to false to show every PUBLISHED venue
// again, regardless of whether photos have been uploaded yet. Admin views
// are unaffected by this flag.
export const HIDE_VENUES_WITHOUT_PHOTOS = true;

// Curated list of hotel amenities for the multi-select on the hotel profile.
export const AMENITIES = [
  "WiFi",
  "Pool",
  "Spa",
  "Gym",
  "Restaurant",
  "Bar",
  "Beach Access",
  "Valet Parking",
  "Concierge",
  "Room Service",
  "Airport Shuttle",
  "Pet-Friendly",
  "ADA Accessible",
  "Air Conditioning",
  "Business Center",
  "Conference Rooms",
] as const;

export const VENUE_TYPES = [
  "Garden",
  "Beachfront",
  "Oceanfront",
  "Ballroom",
  "Rooftop",
  "Poolside",
  "Chapel",
  "Cenote",
] as const;

export const EVENT_TYPES = [
  "Weddings",
  "Corporate",
  "Birthdays",
  "Social",
] as const;

// Which venue types surface under each event-type filter.
export const EVENT_TYPE_MATCH: Record<string, string[]> = {
  Weddings: ["Garden", "Beachfront", "Oceanfront", "Chapel", "Cenote"],
  Corporate: ["Ballroom"],
  Birthdays: ["Poolside", "Rooftop"],
  Social: ["Rooftop", "Poolside", "Garden"],
};

// Inverse of EVENT_TYPE_MATCH — given a venue type, which event categories
// does it support? Used by the public detail page's highlight chips.
export function eventsForType(type: string): string[] {
  return EVENT_TYPES.filter((e) => EVENT_TYPE_MATCH[e]?.includes(type));
}

// Indoor/outdoor classification per venue type. Ballroom and Chapel are
// indoor; the rest are outdoor or semi-outdoor (Cenote = open cenote pool).
const INDOOR_TYPES = new Set(["Ballroom", "Chapel"]);
export function isIndoor(type: string): boolean {
  return INDOOR_TYPES.has(type);
}

export const GRADIENTS: Record<string, string> = {
  Garden: "linear-gradient(150deg,#14533b,#3c7a52 45%,#c4a14a)",
  Beachfront: "linear-gradient(150deg,#0e5d63,#3aa0a8 50%,#e7d3a8)",
  Oceanfront: "linear-gradient(150deg,#1a3d63,#c96a45 55%,#e6b85a)",
  Ballroom: "linear-gradient(150deg,#3a2238,#9b6b3a 55%,#e3c489)",
  Rooftop: "linear-gradient(150deg,#2b2b55,#c0563f 60%,#e8a93c)",
  Poolside: "linear-gradient(150deg,#0e6d72,#3ec0c4 55%,#eef4ee)",
  Chapel: "linear-gradient(150deg,#7a6f5a,#d9c3a3 55%,#f3e9d6)",
  Cenote: "linear-gradient(150deg,#0c3a3f,#1f7a73 55%,#7fc6a8)",
};

export function gradFor(type: string) {
  return GRADIENTS[type] || GRADIENTS.Garden;
}

export const SERVICE_FEE_PCT = 0.12; // Offsite take rate shown to guests

// ─── Booking workflow ─────────────────────────────────────────
// Single source of truth for the state machine. Validates transitions on
// the server (in setBookingStatusAction) and drives the action buttons on
// the booking detail page.
export const BOOKING_STATUSES = [
  "REQUESTED",
  "CONFIRMED",
  "DEPOSIT_HELD",
  "COMPLETED",
  "DECLINED",
  "CANCELLED",
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

// Forward-only happy path with cancel branches at any in-progress state.
// Terminal states (COMPLETED, DECLINED, CANCELLED) cannot transition.
export const STATUS_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  REQUESTED: ["CONFIRMED", "DECLINED"],
  CONFIRMED: ["DEPOSIT_HELD", "CANCELLED"],
  DEPOSIT_HELD: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  DECLINED: [],
  CANCELLED: [],
};

// Statuses that count as "the booking is locked" for the availability
// calendar. Anything from CONFIRMED forward blocks a date for new guests.
export const BLOCKING_STATUSES: BookingStatus[] = [
  "CONFIRMED",
  "DEPOSIT_HELD",
  "COMPLETED",
];

// CSS pill class per status. Extends what's in globals.css; new classes
// (.hold, .done, .cancel) are added in this phase.
export const STATUS_PILL: Record<BookingStatus, string> = {
  REQUESTED: "req",
  CONFIRMED: "ok",
  DEPOSIT_HELD: "hold",
  COMPLETED: "done",
  DECLINED: "no",
  CANCELLED: "cancel",
};

export const STATUS_LABEL: Record<BookingStatus, string> = {
  REQUESTED: "Requested",
  CONFIRMED: "Confirmed",
  DEPOSIT_HELD: "Deposit held",
  COMPLETED: "Completed",
  DECLINED: "Declined",
  CANCELLED: "Cancelled",
};

// Verb labels for the transition buttons on the booking detail page.
// Distinct from STATUS_LABEL — "Confirm" reads better as a CTA than "Confirmed".
export const STATUS_ACTION: Record<BookingStatus, string> = {
  REQUESTED: "Reopen as requested",
  CONFIRMED: "Confirm",
  DEPOSIT_HELD: "Mark deposit held",
  COMPLETED: "Mark completed",
  DECLINED: "Decline",
  CANCELLED: "Cancel",
};

export function canTransition(from: string, to: string): boolean {
  return (STATUS_TRANSITIONS as Record<string, string[]>)[from]?.includes(to) ?? false;
}

// ─── Notes (JSON-on-text on BookingRequest) ───────────────────
export type BookingNote = { author: string; text: string; at: string };
export function parseNotes(s: string): BookingNote[] {
  try {
    const v = JSON.parse(s);
    if (!Array.isArray(v)) return [];
    return v
      .map((n) => ({
        author: String(n?.author ?? "").trim(),
        text: String(n?.text ?? "").trim(),
        at: String(n?.at ?? "").trim(),
      }))
      .filter((n) => n.text.length > 0);
  } catch {
    return [];
  }
}

// Owner-defined pricing. Each venue has 1..N options.
export type PricingOption = {
  label: string;
  durationHours: number;
  price: number;
};

export function quote(price: number, depositPct: number) {
  const base = Math.round(price);
  const serviceFee = Math.round(base * SERVICE_FEE_PCT);
  const total = base + serviceFee;
  const depositDue = Math.round(base * (depositPct / 100));
  return { base, serviceFee, total, depositDue };
}

// Strict parser — drops malformed entries so the UI never has to defend.
export function parsePricingOptions(s: string): PricingOption[] {
  try {
    const v = JSON.parse(s);
    if (!Array.isArray(v)) return [];
    return v
      .map((o) => ({
        label: String(o?.label ?? "").trim(),
        durationHours: Number.isFinite(+o?.durationHours) ? +o.durationHours : 0,
        price: Number.isFinite(+o?.price) ? Math.round(+o.price) : 0,
      }))
      .filter((o) => o.label.length > 0 && o.price > 0);
  } catch {
    return [];
  }
}

// Cheapest option price, used for "From $X" in cards/lists.
// Falls back to basePrice so listings don't go blank during backfill.
export function fromPrice(pricingOptions: string, basePriceFallback: number): number {
  const opts = parsePricingOptions(pricingOptions);
  if (opts.length === 0) return basePriceFallback;
  return Math.min(...opts.map((o) => o.price));
}

// Map a YouTube or Vimeo URL to its embed form. Returns null for anything
// else (file uploads, malformed URLs) so the caller can fall back to <video>.
export function embedFromUrl(url: string): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    // YouTube — watch?v=ID, youtu.be/ID, or already-embed
    if (u.hostname.endsWith("youtube.com")) {
      if (u.pathname === "/watch") {
        const id = u.searchParams.get("v");
        return id ? `https://www.youtube.com/embed/${id}` : null;
      }
      if (u.pathname.startsWith("/embed/")) return url;
    }
    if (u.hostname === "youtu.be") {
      const id = u.pathname.slice(1);
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    // Vimeo — vimeo.com/ID or player.vimeo.com/video/ID
    if (u.hostname === "vimeo.com") {
      const id = u.pathname.replace(/^\//, "").split("/")[0];
      return /^\d+$/.test(id) ? `https://player.vimeo.com/video/${id}` : null;
    }
    if (u.hostname === "player.vimeo.com") return url;
    return null;
  } catch {
    return null;
  }
}

export const fmt = (n: number) => "$" + Math.round(n).toLocaleString();

// Short, human relative-time formatter — "2h ago", "yesterday", "Mar 14".
export function relativeTime(input: string | Date): string {
  const date = typeof input === "string" ? new Date(input) : input;
  if (isNaN(date.getTime())) return "";
  const diffMs = Date.now() - date.getTime();
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 45) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 2) return "yesterday";
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  });
}

// ─── Home-page CMS types + parsers ──────────────────────────
export type ValueCard = { figure: string; title: string; desc: string };
export type SearchPlaceholders = {
  where: string;
  event: string;
  date: string;
  guests: string;
};

// Fallbacks mirror the original hardcoded copy so the page never goes
// blank if a row is missing or malformed.
export const HERO_PLACEHOLDER_FALLBACK: SearchPlaceholders = {
  where: "Cancún · Riviera Maya",
  event: "Wedding ceremony",
  date: "Add dates",
  guests: "120 guests",
};

export function parseValueCards(s: string): ValueCard[] {
  try {
    const v = JSON.parse(s);
    if (!Array.isArray(v)) return [];
    return v
      .map((o) => ({
        figure: String(o?.figure ?? "").trim(),
        title: String(o?.title ?? "").trim(),
        desc: String(o?.desc ?? "").trim(),
      }))
      .filter((c) => c.figure || c.title || c.desc);
  } catch {
    return [];
  }
}

export function parseSearchPlaceholders(s: string): SearchPlaceholders {
  try {
    const v = JSON.parse(s);
    if (!v || typeof v !== "object") return HERO_PLACEHOLDER_FALLBACK;
    return {
      where: String(v.where ?? "").trim() || HERO_PLACEHOLDER_FALLBACK.where,
      event: String(v.event ?? "").trim() || HERO_PLACEHOLDER_FALLBACK.event,
      date: String(v.date ?? "").trim() || HERO_PLACEHOLDER_FALLBACK.date,
      guests:
        String(v.guests ?? "").trim() || HERO_PLACEHOLDER_FALLBACK.guests,
    };
  } catch {
    return HERO_PLACEHOLDER_FALLBACK;
  }
}

// Hero headline italics: split on *word* spans and return a tuple of
// (plain, italic, plain, italic, ...). The caller renders italic spans
// inside <em>. Safe from HTML injection because the page renders the
// parts as React text, never via dangerouslySetInnerHTML.
export function splitItalics(s: string): { text: string; italic: boolean }[] {
  if (!s) return [];
  const out: { text: string; italic: boolean }[] = [];
  const re = /\*([^*]+)\*/g;
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    if (m.index > lastIndex) {
      out.push({ text: s.slice(lastIndex, m.index), italic: false });
    }
    out.push({ text: m[1], italic: true });
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < s.length) {
    out.push({ text: s.slice(lastIndex), italic: false });
  }
  return out;
}

// ─── Date helpers (timezone-safe, YYYY-MM-DD strings) ───
// We store calendar dates as plain YYYY-MM-DD strings to avoid UTC drift —
// `new Date("2026-06-15")` parses as UTC midnight which can shift a day in
// negative timezones. These helpers always work in local time.
export function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
export function fromYMD(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}
const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;
export function parseDateArray(s: string): string[] {
  try {
    const v = JSON.parse(s);
    if (!Array.isArray(v)) return [];
    return Array.from(
      new Set(
        v
          .map((x) => String(x ?? "").trim())
          .filter((x) => YMD_RE.test(x)),
      ),
    ).sort();
  } catch {
    return [];
  }
}

// JSON-in-text helpers (keeps the schema portable to Postgres later)
export function parseArray(s: string): string[] {
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
export function parseObj(s: string): Record<string, any> {
  try {
    const v = JSON.parse(s);
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
}
