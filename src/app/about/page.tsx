import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import {
  gradFor,
  parseArray,
  HIDE_VENUES_WITHOUT_PHOTOS,
  SERVICE_FEE_PCT,
} from "@/lib/data";
import SiteNav from "../_components/SiteNav";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "About · Offsite.ai",
  description:
    "Offsite lists the gardens, beachfronts, ballrooms and rooftops inside Cancún's resorts, priced by the hotel and bookable without a room block.",
};

// Same fallbacks as the home page, so the CTA link and footer stay in step
// with whatever the team sets in the homepage admin.
const FALLBACK_CTA_LINK = "/login";
const FALLBACK_FOOTER = "A DestaLabs company · Cancún pilot · We win when they win.";

const FOR_GUESTS = [
  "Search by date, guest count and event type",
  "See the price, capacity and house rules on every listing",
  "Hold your date with a deposit while the hotel confirms",
  `One ${Math.round(SERVICE_FEE_PCT * 100)}% service fee, shown before you request`,
];
const FOR_HOTELS = [
  "List your venues at zero cost",
  "Set your own prices, rules and blackout dates",
  "Our team builds the listings and handles every request",
  "We only earn when a booking goes through",
];

export default async function About() {
  const [siteRow, allPublished] = await Promise.all([
    prisma.siteSettings.findUnique({ where: { id: "home" } }),
    prisma.venue.findMany({
      where: { status: "PUBLISHED" },
      include: { hotel: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // DEMO_HIDE_NO_PHOTOS: keep the numbers on this page consistent with what
  // the marketplace actually shows.
  const venues = HIDE_VENUES_WITHOUT_PHOTOS
    ? allPublished.filter((v) => parseArray(v.photos).length > 0)
    : allPublished;

  // One tile per resort: venue count, plus the first venue photo we have as
  // the cover (gradient of its venue type otherwise). Biggest resorts first.
  type Resort = { id: string; name: string; city: string; count: number; cover: string; type: string };
  const byHotel = new Map<string, Resort>();
  for (const v of venues) {
    const r = byHotel.get(v.hotelId) ?? {
      id: v.hotelId,
      name: v.hotel.name,
      city: v.hotel.city,
      count: 0,
      cover: "",
      type: v.type,
    };
    r.count += 1;
    if (!r.cover) r.cover = parseArray(v.photos)[0] ?? "";
    byHotel.set(v.hotelId, r);
  }
  const resorts = [...byHotel.values()].sort(
    (a, b) => b.count - a.count || a.name.localeCompare(b.name),
  );
  // Two full rows of tiles; any smaller resorts are named underneath.
  const featured = resorts.slice(0, 8);
  const others = resorts.slice(8);

  // Hero mosaic: three photos from three different resorts.
  const mosaic: { url: string; alt: string; type: string }[] = [];
  const seen = new Set<string>();
  for (const v of venues) {
    const url = parseArray(v.photos)[0];
    if (!url || seen.has(v.hotelId)) continue;
    seen.add(v.hotelId);
    mosaic.push({ url, alt: `${v.name} at ${v.hotel.name}`, type: v.type });
    if (mosaic.length === 3) break;
  }
  const mosaicTypes = ["Garden", "Beachfront", "Rooftop"];
  while (mosaic.length < 3) {
    mosaic.push({ url: "", alt: "", type: mosaicTypes[mosaic.length] });
  }

  const stats = [
    { figure: String(resorts.length), title: "resorts on Offsite", desc: "Across Cancún and the Riviera Maya." },
    { figure: String(venues.length), title: "venues to book", desc: "Each one priced and bookable on its own." },
    { figure: String(new Set(venues.map((v) => v.type)).size), title: "kinds of space", desc: "Gardens, beachfronts, ballrooms, rooftops and more." },
    { figure: "$0", title: "to list a venue", desc: "Hotels pay nothing until a booking goes through." },
  ];

  const ctaLink = siteRow?.ctaButtonLink || FALLBACK_CTA_LINK;
  const footerTagline = siteRow?.footerTagline || FALLBACK_FOOTER;

  return (
    <>
      <SiteNav />

      {/* ─── HERO (statement + photo mosaic) ────────────────────────── */}
      <div className="ab-hero">
        <div>
          <div className="eyebrow">
            <span className="dot" /> About Offsite
          </div>
          <h1 className="h1">
            Book the venue, <em>not the room block.</em>
          </h1>
          <p className="sub">
            Offsite is a marketplace for the spaces inside Cancún&apos;s resorts. Gardens,
            beachfronts, ballrooms and rooftops, listed at the hotel&apos;s own price and bookable
            for your date.
          </p>
          <div className="ab-actions">
            <Link href="/venues" className="btn-fill">
              Browse venues
            </Link>
            <Link href={ctaLink} className="btn-ghost">
              List your venue
            </Link>
          </div>
        </div>
        <div className="ab-mosaic">
          {mosaic.map((m, i) => (
            <div
              key={i}
              role={m.url ? "img" : undefined}
              aria-label={m.url ? m.alt : undefined}
              style={{
                background: gradFor(m.type),
                backgroundImage: m.url ? `url(${m.url})` : gradFor(m.type),
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            />
          ))}
        </div>
      </div>

      {/* ─── LIVE NUMBERS ───────────────────────────────────────────── */}
      <div className="ab-stats">
        {stats.map((s) => (
          <div className="mcard" key={s.title}>
            <div className="n">{s.figure}</div>
            <div className="t">{s.title}</div>
            <div className="d">{s.desc}</div>
          </div>
        ))}
      </div>

      {/* ─── STORY ──────────────────────────────────────────────────── */}
      <div className="section ab-story">
        <h2>Why we built Offsite</h2>
        <div>
          <p>
            Every resort on the coast has spaces that sit empty most of the week: a lawn between
            ceremonies, a rooftop before sunset, a ballroom on a Tuesday.
          </p>
          <p>
            Booking one used to mean committing to an all-inclusive room block. Offsite lists the
            venue on its own, with the price, the capacity and the rules up front, so you can
            compare venues and hold a date in one sitting.
          </p>
          <p>
            Offsite is built by DestaLabs. We started in Cancún and the Riviera Maya, and we work
            hand in hand with every hotel we list.
          </p>
        </div>
      </div>

      {/* ─── TWO SIDES ──────────────────────────────────────────────── */}
      <div className="section">
        <div className="shead">
          <div>
            <h2>How Offsite works</h2>
            <p>One marketplace, two sides that both come out ahead</p>
          </div>
        </div>
        <div className="ab-sides">
          <div className="ab-side">
            <div className="chotel">For guests</div>
            <h3>Find the venue first</h3>
            <ul>
              {FOR_GUESTS.map((t) => (
                <li key={t}>
                  <span className="ck">✓</span> {t}
                </li>
              ))}
            </ul>
            <Link href="/venues" className="see">
              Browse venues →
            </Link>
          </div>
          <div className="ab-side">
            <div className="chotel">For hotels</div>
            <h3>Earn from idle space</h3>
            <ul>
              {FOR_HOTELS.map((t) => (
                <li key={t}>
                  <span className="ck">✓</span> {t}
                </li>
              ))}
            </ul>
            <Link href={ctaLink} className="see">
              Partner with us →
            </Link>
          </div>
        </div>
      </div>

      {/* ─── RESORTS ────────────────────────────────────────────────── */}
      {resorts.length > 0 && (
        <div className="section">
          <div className="shead">
            <div>
              <h2>Resorts on Offsite</h2>
              <p>The hotels whose venues you can book today</p>
            </div>
            <Link href="/venues" className="see">
              See all venues →
            </Link>
          </div>
          <div className="grid ab-resorts">
            {featured.map((r) => (
              <div className="ab-resort" key={r.id}>
                <div
                  className="cmedia"
                  style={{
                    background: gradFor(r.type),
                    backgroundImage: r.cover ? `url(${r.cover})` : gradFor(r.type),
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                />
                <div className="cbody">
                  <div className="cname">{r.name}</div>
                  <div className="cloc">⚲ {r.city}</div>
                  <div className="cprice">
                    <b>{r.count}</b> venue{r.count === 1 ? "" : "s"}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {others.length > 0 && (
            <p className="ab-more">
              <b>Also on Offsite:</b> {others.map((r) => r.name).join(" · ")}
            </p>
          )}
        </div>
      )}

      {/* ─── CTA BAND ───────────────────────────────────────────────── */}
      <div className="band">
        <div className="band-in">
          <h2>Have a space that sits empty?</h2>
          <p>
            List it on Offsite at zero cost. You keep control of the price, the rules and the
            calendar, and we bring you groups you weren&apos;t reaching.
          </p>
          <Link href={ctaLink} className="btn-fill">
            Partner with us →
          </Link>
        </div>
      </div>

      {/* ─── FOOTER ─────────────────────────────────────────────────── */}
      <div className="foot">
        <div className="logo">
          offsite<b>.ai</b>
        </div>
        <div>{footerTagline}</div>
      </div>
    </>
  );
}
