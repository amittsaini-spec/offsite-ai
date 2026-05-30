// Shared constants + pure helpers used across server and client components.

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

export const TIERS = [
  { label: "Half-day · 4 hours", mult: 1, sub: "Single ceremony or reception block" },
  { label: "Full-day · 8 hours", mult: 1.8, sub: "Ceremony + reception, no transition gap" },
  { label: "Full takeover · 12 hours", mult: 2.5, sub: "Exclusive use, full styling window" },
];

export function priceForTier(basePrice: number, mult: number) {
  return Math.round(basePrice * mult);
}

export function quote(basePrice: number, mult: number, depositPct: number) {
  const base = priceForTier(basePrice, mult);
  const serviceFee = Math.round(base * SERVICE_FEE_PCT);
  const total = base + serviceFee;
  const depositDue = Math.round(base * (depositPct / 100));
  return { base, serviceFee, total, depositDue };
}

export const fmt = (n: number) => "$" + Math.round(n).toLocaleString();

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
