import Link from "next/link";
import { prisma } from "@/lib/db";
import { EVENT_TYPES, EVENT_TYPE_MATCH } from "@/lib/data";
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

export default async function Browse({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; tag?: string; event?: string; sort?: string }>;
}) {
  const sp = await searchParams;
  const event = sp.event || "All";
  const tag = sp.tag || "All";
  const type = sp.type || "";
  const sort = sp.sort || "Recommended";

  let venues = await prisma.venue.findMany({
    where: { status: "PUBLISHED" },
    include: { hotel: true },
    orderBy: { createdAt: "desc" },
  });

  if (type) venues = venues.filter((v) => v.type === type);
  if (event !== "All")
    venues = venues.filter((v) => EVENT_TYPE_MATCH[event]?.includes(v.type));
  if (tag !== "All")
    venues = venues.filter((v) => v.tags.includes(tag) || v.type === tag);

  if (sort === "Price ↑") venues.sort((a, b) => a.basePrice - b.basePrice);
  if (sort === "Price ↓") venues.sort((a, b) => b.basePrice - a.basePrice);

  const base = (over: Record<string, string>) => {
    const p = new URLSearchParams();
    const merged = { event, tag, type, sort, ...over };
    for (const [k, val] of Object.entries(merged))
      if (val && val !== "All") p.set(k, val);
    return "/venues?" + p.toString();
  };

  return (
    <>
      <SiteNav />
      <div className="browse">
        <Link href="/" className="back">
          ← Home
        </Link>
        <h1 className="dtitle" style={{ fontSize: 34, marginTop: 10 }}>
          Venues in Cancún &amp; the Riviera Maya
        </h1>

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
