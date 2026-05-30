import Link from "next/link";
import { prisma } from "@/lib/db";
import { gradFor, parseArray, HIDE_VENUES_WITHOUT_PHOTOS } from "@/lib/data";
import SiteNav from "./_components/SiteNav";
import VenueCard from "./_components/VenueCard";

export const dynamic = "force-dynamic";

const COLLECTIONS = [
  { s: "For the ceremony", b: "Garden Ceremonies", type: "Garden", q: "Garden" },
  { s: "For the reception", b: "Beachfront Receptions", type: "Beachfront", q: "Beachfront" },
  { s: "For business", b: "Boardrooms with a View", type: "Ballroom", q: "Ballroom" },
  { s: "For the night", b: "Rooftop Celebrations", type: "Rooftop", q: "Rooftop" },
];

export default async function Home() {
  const allPublished = await prisma.venue.findMany({
    where: { status: "PUBLISHED" },
    include: { hotel: true },
    orderBy: { createdAt: "desc" },
  });

  // DEMO_HIDE_NO_PHOTOS: filter out venues without uploaded photos so the
  // public marketplace looks complete. Flip HIDE_VENUES_WITHOUT_PHOTOS in
  // lib/data.ts to disable — admin views are unaffected.
  const venues = HIDE_VENUES_WITHOUT_PHOTOS
    ? allPublished.filter((v) => parseArray(v.photos).length > 0)
    : allPublished;

  const hot = venues.filter((v) => v.tags.includes("Hot Pick")).slice(0, 3);
  const gardens = venues.filter((v) => v.type === "Garden").slice(0, 3);

  return (
    <>
      <SiteNav />

      <div className="hero">
        <div className="eyebrow">
          <span className="dot" /> Now live · Cancún test market
        </div>
        <h1 className="h1">
          The hotel&apos;s most beautiful spaces, <em>finally</em> bookable.
        </h1>
        <p className="sub">
          Search idle venue inventory across Cancún&apos;s best resorts — gardens, beachfronts,
          ballrooms and rooftops. Compare pricing, see the rules, and hold your date with a
          deposit. No all-inclusive room block required.
        </p>

        <div className="search">
          <div className="sfield">
            <div className="lab">Where</div>
            <div className="val">Cancún · Riviera Maya</div>
          </div>
          <div className="sfield">
            <div className="lab">Event</div>
            <div className="val">Wedding ceremony</div>
          </div>
          <div className="sfield">
            <div className="lab">Date</div>
            <div className="val">Add dates</div>
          </div>
          <div className="sfield">
            <div className="lab">Guests</div>
            <div className="val">120 guests</div>
          </div>
          <Link href="/venues" className="sgo">
            ⚲ Search
          </Link>
        </div>
      </div>

      <div className="model">
        <div className="mcard">
          <div className="n">$0</div>
          <div className="t">upfront for hotels</div>
          <div className="d">We only earn a % when your venue books. We win when you win.</div>
        </div>
        <div className="mcard">
          <div className="n">4 hrs</div>
          <div className="t">of idle garden = revenue</div>
          <div className="d">A space sitting empty is a $20k line item waiting to be claimed.</div>
        </div>
        <div className="mcard">
          <div className="n">1 click</div>
          <div className="t">from search to deposit</div>
          <div className="d">Browse, compare policies, hold a date — the Airbnb flow, for venues.</div>
        </div>
      </div>

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
          {COLLECTIONS.map((c) => (
            <Link
              key={c.b}
              href={`/venues?type=${c.q}`}
              className="card"
              style={{ position: "relative", color: "#fff", minHeight: 220 }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: gradFor(c.type),
                  borderRadius: 18,
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
                <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.85 }}>{c.s}</div>
                <div
                  className="serif"
                  style={{ fontSize: 21, fontWeight: 500, marginTop: 3 }}
                >
                  {c.b}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {hot.length > 0 && (
        <div className="section">
          <div className="shead">
            <div>
              <h2>Hot picks in Cancún</h2>
              <p>The venues groups are reserving right now</p>
            </div>
            <Link href="/venues?tag=Hot+Pick" className="see">
              See all hot picks →
            </Link>
          </div>
          <div className="grid">
            {hot.map((v) => (
              <VenueCard key={v.id} v={v} />
            ))}
          </div>
        </div>
      )}

      {gardens.length > 0 && (
        <div className="section">
          <div className="shead">
            <div>
              <h2>Garden venues</h2>
              <p>Lawns, courtyards and tropical gardens</p>
            </div>
            <Link href="/venues?type=Garden" className="see">
              See all gardens →
            </Link>
          </div>
          <div className="grid">
            {gardens.map((v) => (
              <VenueCard key={v.id} v={v} />
            ))}
          </div>
        </div>
      )}

      <div className="band">
        <div className="band-in">
          <h2>Own a venue that&apos;s empty more than it should be?</h2>
          <p>
            List it on Offsite at zero cost. Set your own price, your own rules, your own blackout
            dates. You keep full control — we just bring you demand you weren&apos;t reaching. You
            only pay when you get paid.
          </p>
          <Link href="/login" className="btn-fill">
            Partner with us →
          </Link>
        </div>
      </div>

      <div className="foot">
        <div className="logo">
          offsite<b>.ai</b>
        </div>
        <div>A DestaLabs company · Cancún pilot · We win when they win.</div>
      </div>
    </>
  );
}
