import Link from "next/link";
import { prisma } from "@/lib/db";
import {
  EVENT_TYPES,
  EVENT_TYPE_MATCH,
  MARKETS,
  fromPrice,
  parseArray,
  parseDateArray,
  HIDE_VENUES_WITHOUT_PHOTOS,
  BLOCKING_STATUSES,
} from "@/lib/data";
import SiteNav from "../_components/SiteNav";
import VenueCard from "../_components/VenueCard";

export const dynamic = "force-dynamic";

const TAGS = [
  "All",
  "Hot Pick",
  "Garden Venues",
  "Beachfront",
  "Oceanfront",
  "Rooftop",
  "Ballroom",
  "Chapel",
  "Value",
];

const YMD = /^\d{4}-\d{2}-\d{2}$/;

type SP = {
  type?: string;
  tag?: string;
  event?: string;
  sort?: string;
  market?: string;
  date?: string;
  guests?: string;
};

export default async function Browse({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const event = sp.event && sp.event !== "All" ? sp.event : "All";
  const tag = sp.tag || "All";
  const type = sp.type || "";
  const sort = sp.sort || "Recommended";
  const market = sp.market && (MARKETS as readonly string[]).includes(sp.market)
    ? sp.market
    : "";
  const date = sp.date && YMD.test(sp.date) ? sp.date : "";
  const guestsNum = sp.guests ? parseInt(sp.guests, 10) : NaN;
  const guests = Number.isFinite(guestsNum) && guestsNum > 0 ? guestsNum : 0;

  // Single pull of published venues + hotel. Date / capacity / market
  // filtering happens in-memory below; volume is small enough that this
  // beats the gymnastics of conditional Prisma includes.
  let venues = await prisma.venue.findMany({
    where: { status: "PUBLISHED" },
    include: { hotel: true },
    orderBy: { createdAt: "desc" },
  });

  // DEMO_HIDE_NO_PHOTOS: filter out venues without uploaded photos so the
  // public marketplace looks complete. Flip HIDE_VENUES_WITHOUT_PHOTOS in
  // lib/data.ts to disable — admin views are unaffected.
  if (HIDE_VENUES_WITHOUT_PHOTOS) {
    venues = venues.filter((v) => parseArray(v.photos).length > 0);
  }

  // Existing chip filters.
  if (type) venues = venues.filter((v) => v.type === type);
  if (event !== "All")
    venues = venues.filter((v) => EVENT_TYPE_MATCH[event]?.includes(v.type));
  if (tag !== "All")
    venues = venues.filter((v) => v.tags.includes(tag) || v.type === tag);

  // New filters from the hero search.
  if (market) venues = venues.filter((v) => v.hotel.market === market);
  if (guests > 0) venues = venues.filter((v) => v.standing >= guests);

  // Availability filter: pull the venue ids that are blocked on this date
  // by a CONFIRMED+ booking, then drop those plus anything whose admin
  // blackoutDates includes the picked date.
  if (date) {
    const bookedVenueIds = new Set(
      (
        await prisma.bookingRequest.findMany({
          where: {
            status: { in: BLOCKING_STATUSES },
            eventDate: date,
          },
          select: { venueId: true },
        })
      ).map((b) => b.venueId),
    );
    venues = venues.filter((v) => {
      if (bookedVenueIds.has(v.id)) return false;
      return !parseDateArray(v.blackoutDates).includes(date);
    });
  }

  if (sort === "Price ↑")
    venues.sort(
      (a, b) => fromPrice(a.pricingOptions, a.basePrice) - fromPrice(b.pricingOptions, b.basePrice),
    );
  if (sort === "Price ↓")
    venues.sort(
      (a, b) => fromPrice(b.pricingOptions, b.basePrice) - fromPrice(a.pricingOptions, a.basePrice),
    );

  // Build a /venues link with the given overrides, preserving all other
  // active filters. Empty / "All" values are stripped so URLs stay clean.
  const base = (over: Record<string, string>) => {
    const p = new URLSearchParams();
    const merged: Record<string, string> = {
      event,
      tag,
      type,
      sort,
      market,
      date,
      guests: guests ? String(guests) : "",
      ...over,
    };
    for (const [k, val] of Object.entries(merged)) {
      if (val && val !== "All") p.set(k, val);
    }
    return "/venues?" + p.toString();
  };

  const hasRefinement = Boolean(date || guests);

  const title = market ? `Venues in ${market}` : "Venues across our markets";

  return (
    <>
      <SiteNav />
      <div className="browse">
        <Link href="/" className="back">
          ← Home
        </Link>
        <h1 className="dtitle" style={{ fontSize: 34, marginTop: 10 }}>
          {title}
        </h1>

        {/* Market chips — sits above the existing event row so the city
            switch is the first thing a visitor sees. */}
        <div className="bbar">
          <div className="chips">
            <Link className={"chip" + (!market ? " on" : "")} href={base({ market: "" })}>
              All markets
            </Link>
            {MARKETS.map((m) => (
              <Link
                key={m}
                className={"chip" + (market === m ? " on" : "")}
                href={base({ market: m })}
              >
                {m}
              </Link>
            ))}
          </div>
        </div>

        <div className="bbar">
          <div className="chips">
            <Link className={"chip" + (event === "All" ? " on" : "")} href={base({ event: "All" })}>
              All
            </Link>
            {EVENT_TYPES.map((t) => (
              <Link key={t} className={"chip" + (event === t ? " on" : "")} href={base({ event: t })}>
                {t}
              </Link>
            ))}
          </div>
        </div>

        <div className="bbar">
          <div className="chips">
            {TAGS.map((t) => (
              <Link
                key={t}
                className={"chip" + ((t === "All" ? tag === "All" && !type : tag === t || type === t) ? " on" : "")}
                href={t === "All" ? base({ tag: "All", type: "" }) : base({ tag: t, type: "" })}
              >
                {t === "Hot Pick" ? "🔥 " : ""}
                {t}
              </Link>
            ))}
          </div>
          <div className="bcount">{venues.length} venues</div>
        </div>

        {/* Refine bar — date + guests editable here so users aren't
            stuck with whatever the hero search submitted. */}
        <form
          action="/venues"
          method="get"
          className="refine-bar"
          style={{ marginBottom: 22 }}
        >
          {/* Preserve all other active filters across the refine submit. */}
          {market && <input type="hidden" name="market" value={market} />}
          {event !== "All" && <input type="hidden" name="event" value={event} />}
          {tag !== "All" && <input type="hidden" name="tag" value={tag} />}
          {type && <input type="hidden" name="type" value={type} />}
          {sort !== "Recommended" && <input type="hidden" name="sort" value={sort} />}
          <div className="ff">
            <label htmlFor="r-date">Date</label>
            <input id="r-date" name="date" type="date" defaultValue={date} />
          </div>
          <div className="ff">
            <label htmlFor="r-guests">Guests (min capacity)</label>
            <input
              id="r-guests"
              name="guests"
              type="number"
              min={1}
              defaultValue={guests || ""}
              placeholder="120"
            />
          </div>
          <button type="submit" className="fapply">
            Refine
          </button>
          {hasRefinement && (
            <Link className="fclear" href={base({ date: "", guests: "" })}>
              Clear date &amp; guests
            </Link>
          )}
        </form>

        {venues.length > 0 ? (
          <div className="grid">
            {venues.map((v) => (
              <VenueCard key={v.id} v={v} />
            ))}
          </div>
        ) : (
          <p className="empty">No venues match those filters yet — try widening your search.</p>
        )}
      </div>
    </>
  );
}
