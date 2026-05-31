import Link from "next/link";
import type { ReactNode } from "react";
import { prisma } from "@/lib/db";
import {
  gradFor,
  parseArray,
  parseValueCards,
  parseSearchPlaceholders,
  splitItalics,
  HIDE_VENUES_WITHOUT_PHOTOS,
} from "@/lib/data";
import SiteNav from "./_components/SiteNav";
import VenueCard from "./_components/VenueCard";
import HeroBackground from "./_components/HeroBackground";

export const dynamic = "force-dynamic";

// Category pills sit directly under the search bar in the hero. Today
// they're a hardcoded default set — easy to lift into the homepage admin
// later as another JSON-on-SiteSettings column. Each pill is just a
// labelled link to /venues with the right filter applied.
type CategoryPill = { label: string; href: string; primary?: boolean };
const CATEGORY_PILLS: CategoryPill[] = [
  { label: "All venues", href: "/venues", primary: true },
  { label: "Weddings", href: "/venues?event=Weddings" },
  { label: "Corporate", href: "/venues?event=Corporate" },
  { label: "Birthdays", href: "/venues?event=Birthdays" },
  { label: "Gardens", href: "/venues?type=Garden" },
  { label: "Beachfront", href: "/venues?type=Beachfront" },
  { label: "Rooftops", href: "/venues?type=Rooftop" },
];

// Original copy + structure used both when a row is missing and to seed
// fresh installs. Keeps the page identical to the pre-CMS version when
// the SiteSettings row hasn't been customized yet.
const FALLBACK_SITE = {
  heroEyebrow: "Now live · Cancún test market",
  heroHeadline: "The hotel's most beautiful spaces, *finally* bookable.",
  heroSubhead:
    "Search idle venue inventory across Cancún's best resorts — gardens, beachfronts, ballrooms and rooftops. Compare pricing, see the rules, and hold your date with a deposit. No all-inclusive room block required.",
  ctaHeadline: "Own a venue that's empty more than it should be?",
  ctaBody:
    "List it on Offsite at zero cost. Set your own price, your own rules, your own blackout dates. You keep full control — we just bring you demand you weren't reaching. You only pay when you get paid.",
  ctaButtonLabel: "Partner with us →",
  ctaButtonLink: "/login",
  footerTagline: "A DestaLabs company · Cancún pilot · We win when they win.",
};

const FALLBACK_VALUE_CARDS = [
  {
    figure: "$0",
    title: "upfront for hotels",
    desc: "We only earn a % when your venue books. We win when you win.",
  },
  {
    figure: "4 hrs",
    title: "of idle garden = revenue",
    desc: "A space sitting empty is a $20k line item waiting to be claimed.",
  },
  {
    figure: "1 click",
    title: "from search to deposit",
    desc:
      "Browse, compare policies, hold a date — the Airbnb flow, for venues.",
  },
];

const FALLBACK_COLLECTIONS = [
  { id: "fb-1", title: "For the ceremony", subtitle: "Garden Ceremonies", imageUrl: "", linkType: "type", linkValue: "Garden", sortOrder: 0 },
  { id: "fb-2", title: "For the reception", subtitle: "Beachfront Receptions", imageUrl: "", linkType: "type", linkValue: "Beachfront", sortOrder: 1 },
  { id: "fb-3", title: "For business", subtitle: "Boardrooms with a View", imageUrl: "", linkType: "type", linkValue: "Ballroom", sortOrder: 2 },
  { id: "fb-4", title: "For the night", subtitle: "Rooftop Celebrations", imageUrl: "", linkType: "type", linkValue: "Rooftop", sortOrder: 3 },
];

const FALLBACK_SECTIONS = [
  { id: "fb-1", title: "Hot picks in Cancún", subtitle: "The venues groups are reserving right now", filterType: "tag", filterValue: "Hot Pick", sortOrder: 0, enabled: true },
  { id: "fb-2", title: "Garden venues", subtitle: "Lawns, courtyards and tropical gardens", filterType: "type", filterValue: "Garden", sortOrder: 1, enabled: true },
];

// Render *asterisk-wrapped* words as <em>.
function renderHeadline(text: string): ReactNode[] {
  return splitItalics(text).map((part, i) =>
    part.italic ? <em key={i}>{part.text}</em> : <span key={i}>{part.text}</span>,
  );
}

function collectionHref(linkType: string, linkValue: string): string {
  if (!linkValue) return "/venues";
  const p = new URLSearchParams();
  if (linkType === "tag") p.set("tag", linkValue);
  else p.set("type", linkValue);
  return `/venues?${p.toString()}`;
}
function sectionHref(filterType: string, filterValue: string): string {
  if (filterType === "tag" && filterValue) return `/venues?tag=${encodeURIComponent(filterValue)}`;
  if (filterType === "type" && filterValue) return `/venues?type=${encodeURIComponent(filterValue)}`;
  return "/venues";
}

export default async function Home() {
  // Pull CMS content + every PUBLISHED venue in parallel. Filtering for
  // sections happens in-memory because there are only a few sections and
  // we already have the full venue list anyway.
  const [siteRow, collections, sections, allPublished] = await Promise.all([
    prisma.siteSettings.findUnique({ where: { id: "home" } }),
    prisma.homeCollection.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.homeSection.findMany({
      where: { enabled: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.venue.findMany({
      where: { status: "PUBLISHED" },
      include: { hotel: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // DEMO_HIDE_NO_PHOTOS: filter out venues without uploaded photos so the
  // public marketplace looks complete. Flip HIDE_VENUES_WITHOUT_PHOTOS in
  // lib/data.ts to disable — admin views are unaffected.
  const venues = HIDE_VENUES_WITHOUT_PHOTOS
    ? allPublished.filter((v) => parseArray(v.photos).length > 0)
    : allPublished;

  const site = siteRow ?? null;
  const heroEyebrow = site?.heroEyebrow || FALLBACK_SITE.heroEyebrow;
  const heroHeadline = site?.heroHeadline || FALLBACK_SITE.heroHeadline;
  const heroSubhead = site?.heroSubhead || FALLBACK_SITE.heroSubhead;
  const heroMediaType = site?.heroMediaType ?? "none";
  const heroMedia = parseArray(site?.heroMedia ?? "[]");
  const heroVideoEmbed = site?.heroVideoEmbed ?? "";
  const placeholders = parseSearchPlaceholders(site?.searchPlaceholders ?? "{}");
  const valueCards =
    (site && parseValueCards(site.valueCards).length > 0
      ? parseValueCards(site.valueCards)
      : FALLBACK_VALUE_CARDS);
  const ctaHeadline = site?.ctaHeadline || FALLBACK_SITE.ctaHeadline;
  const ctaBody = site?.ctaBody || FALLBACK_SITE.ctaBody;
  const ctaButtonLabel = site?.ctaButtonLabel || FALLBACK_SITE.ctaButtonLabel;
  const ctaButtonLink = site?.ctaButtonLink || FALLBACK_SITE.ctaButtonLink;
  const footerTagline = site?.footerTagline || FALLBACK_SITE.footerTagline;

  const visibleCollections = collections.length > 0 ? collections : FALLBACK_COLLECTIONS;
  const visibleSections = sections.length > 0 ? sections : FALLBACK_SECTIONS;

  return (
    <>
      <SiteNav />

      {/* ─── HERO (statement + search + category pills) ─────────────── */}
      <div className="hero-wrap">
        <HeroBackground
          mediaType={heroMediaType}
          mediaUrls={heroMedia}
          videoEmbed={heroVideoEmbed}
        />
        <div className="hero">
          <div className="eyebrow">
            <span className="dot" /> {heroEyebrow}
          </div>
          <h1 className="h1">{renderHeadline(heroHeadline)}</h1>
          <p className="sub">{heroSubhead}</p>

          <div className="search">
            <div className="sfield">
              <div className="lab">Where</div>
              <div className="val">{placeholders.where}</div>
            </div>
            <div className="sfield">
              <div className="lab">Event</div>
              <div className="val">{placeholders.event}</div>
            </div>
            <div className="sfield">
              <div className="lab">Date</div>
              <div className="val">{placeholders.date}</div>
            </div>
            <div className="sfield">
              <div className="lab">Guests</div>
              <div className="val">{placeholders.guests}</div>
            </div>
            <Link href="/venues" className="sgo">
              ⚲ Search
            </Link>
          </div>

          {/* Category pills — quick filters that link straight into /venues. */}
          <div className="hero-pills">
            {CATEGORY_PILLS.map((p) => (
              <Link
                key={p.label}
                href={p.href}
                className={"hero-pill" + (p.primary ? " primary" : "")}
              >
                {p.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ─── VENUE FEEDS (HomeSection rows) ─────────────────────────── */}
      {visibleSections.map((s) => {
        const matches = filterVenues(venues, s.filterType, s.filterValue).slice(0, 3);
        if (matches.length === 0) return null;
        return (
          <div className="section" key={s.id}>
            <div className="shead">
              <div>
                <h2>{s.title}</h2>
                <p>{s.subtitle}</p>
              </div>
              <Link href={sectionHref(s.filterType, s.filterValue)} className="see">
                See all →
              </Link>
            </div>
            <div className="grid">
              {matches.map((v) => (
                <VenueCard key={v.id} v={v} />
              ))}
            </div>
          </div>
        );
      })}

      {/* ─── SHOP BY MOMENT (HomeCollection cards) ──────────────────── */}
      <div className="section">
        <div className="shead">
          <div>
            <h2>Shop by moment</h2>
            <p>Curated collections across the Riviera</p>
          </div>
          <Link href="/venues" className="see">
            View all →
          </Link>
        </div>
        <div className="grid">
          {visibleCollections.map((c) => {
            // Gradient fallback prefers the linked venue type's gradient, then
            // a sand-emerald default so tag-linked cards still look like ours.
            const gradient =
              c.linkType === "type" ? gradFor(c.linkValue) : gradFor("Garden");
            const hasImage = c.imageUrl && c.imageUrl.length > 0;
            return (
              <Link
                key={c.id}
                href={collectionHref(c.linkType, c.linkValue)}
                className="card"
                style={{ position: "relative", color: "#fff", minHeight: 220 }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: 18,
                    background: gradient,
                    backgroundImage: hasImage ? `url(${c.imageUrl})` : undefined,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: 18,
                    background:
                      "linear-gradient(180deg,transparent 35%,rgba(0,0,0,.55))",
                  }}
                />
                <div style={{ position: "absolute", left: 20, bottom: 20, zIndex: 2 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.85 }}>
                    {c.title}
                  </div>
                  <div
                    className="serif"
                    style={{ fontSize: 21, fontWeight: 500, marginTop: 3 }}
                  >
                    {c.subtitle}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ─── VALUE STRIP (moved below the supporting sections) ──────── */}
      <div className="model">
        {valueCards.map((c, i) => (
          <div className="mcard" key={`${c.title}-${i}`}>
            <div className="n">{c.figure}</div>
            <div className="t">{c.title}</div>
            <div className="d">{c.desc}</div>
          </div>
        ))}
      </div>

      {/* ─── CTA BAND ───────────────────────────────────────────────── */}
      <div className="band">
        <div className="band-in">
          <h2>{ctaHeadline}</h2>
          <p>{ctaBody}</p>
          <Link href={ctaButtonLink} className="btn-fill">
            {ctaButtonLabel}
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

// Pure in-memory filter for the venue feed sections. Kept here because
// it only matters on the home page; the rest of the marketplace does
// its own filtering at the Prisma level via search params.
type V = Awaited<ReturnType<typeof prisma.venue.findMany>>[number] & {
  hotel: { name: string; city: string };
};

function filterVenues(venues: V[], filterType: string, filterValue: string): V[] {
  if (filterType === "tag" && filterValue) {
    return venues.filter((v) => parseArray(v.tags).includes(filterValue));
  }
  if (filterType === "type" && filterValue) {
    return venues.filter((v) => v.type === filterValue);
  }
  if (filterType === "featured") {
    return venues.filter((v) => parseArray(v.tags).includes("Hot Pick"));
  }
  // Unknown filter → empty list rather than dumping every venue.
  return [];
}
