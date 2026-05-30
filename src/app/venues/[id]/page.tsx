import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  gradFor,
  parseArray,
  parseObj,
  parsePricingOptions,
  parseDateArray,
  embedFromUrl,
  eventsForType,
  isIndoor,
  BLOCKING_STATUSES,
} from "@/lib/data";
import SiteNav from "../../_components/SiteNav";
import BookingForm from "./BookingForm";
import PhotoGallery from "./PhotoGallery";
import HotelMap from "./HotelMap";

export const dynamic = "force-dynamic";

export default async function VenueDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ booked?: string }>;
}) {
  const { id } = await params;
  const { booked } = await searchParams;

  const v = await prisma.venue.findUnique({
    where: { id },
    include: {
      hotel: true,
      bookings: {
        where: { status: { in: BLOCKING_STATUSES } },
        select: { eventDate: true },
      },
    },
  });
  if (!v) notFound();

  const tags = parseArray(v!.tags);
  const included = parseArray(v!.included);
  const layouts = parseObj(v!.layouts) as Record<string, number>;
  const rules = parseObj(v!.rules) as Record<string, string>;
  const pricingOptions = parsePricingOptions(v!.pricingOptions);
  const photos = parseArray(v!.photos);
  const floorPlans = parseArray(v!.floorPlans);
  // Unselectable dates on the public calendar: admin blackouts + dates of
  // any CONFIRMED booking on this venue (prevents double-booking).
  const blackoutDates = parseDateArray(v!.blackoutDates);
  const confirmedDates = Array.from(
    new Set(
      v!.bookings
        .map((b) => b.eventDate)
        .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)),
    ),
  );
  const unavailableDates = Array.from(new Set([...blackoutDates, ...confirmedDates]));
  const grad = gradFor(v!.type);
  const embed = embedFromUrl(v!.videoUrl);
  const shortestHours = pricingOptions.length
    ? Math.min(...pricingOptions.map((o) => o.durationHours).filter((h) => h > 0))
    : 0;

  const events = eventsForType(v!.type);
  const indoorOutdoor = isIndoor(v!.type) ? "Indoor" : "Outdoor";

  // Map only renders when both coordinates are present.
  const hasCoords =
    typeof v!.hotel.latitude === "number" && typeof v!.hotel.longitude === "number";

  return (
    <>
      <SiteNav />
      <div className="detail">
        <Link href="/venues" className="back">
          ← All venues
        </Link>
        <div className="chotel">{v!.hotel.name}</div>
        <h1 className="dtitle">{v!.name}</h1>
        <div className="dmeta">
          <span>⚲ {v!.hotel.city}</span>
          <span>· {v!.type}</span>
          {tags.includes("Hot Pick") && (
            <span style={{ color: "var(--coral-d)", fontWeight: 600 }}>🔥 Hot Pick</span>
          )}
        </div>

        {/* Highlight chips: capacity, event categories, indoor/outdoor */}
        <div className="vchips">
          <span className="vchip emerald">
            <span className="vcdot" /> Up to {v!.standing.toLocaleString()} guests
          </span>
          {events.map((e) => (
            <span key={e} className="vchip">
              {e}
            </span>
          ))}
          <span className="vchip">{indoorOutdoor}</span>
          {tags
            .filter((t) => t !== "Hot Pick")
            .slice(0, 3)
            .map((t) => (
              <span key={t} className="vchip">
                {t}
              </span>
            ))}
        </div>

        <PhotoGallery
          photos={photos}
          floorPlans={floorPlans}
          tourUrl={v!.tourUrl}
          fallbackGradient={grad}
        />

        {(embed || (v!.videoUrl && /\.(mp4|webm|mov)(\?|$)/i.test(v!.videoUrl))) && (
          <div className="dsec" style={{ borderTop: "1px solid var(--line)" }}>
            <h3>Video tour</h3>
            {embed ? (
              <div
                style={{
                  position: "relative",
                  paddingBottom: "56.25%",
                  height: 0,
                  borderRadius: 14,
                  overflow: "hidden",
                  border: "1px solid var(--line)",
                }}
              >
                <iframe
                  src={embed}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
                />
              </div>
            ) : (
              <video
                src={v!.videoUrl}
                controls
                style={{ width: "100%", borderRadius: 14, border: "1px solid var(--line)" }}
              />
            )}
          </div>
        )}

        <div className="dwrap">
          <div>
            <div className="dsec" style={{ borderTop: "1px solid var(--line)" }}>
              <p style={{ fontSize: 16, color: "var(--ink-2)", lineHeight: 1.6 }}>
                {v!.description}
              </p>
            </div>

            <div className="dsec">
              <h3>The space</h3>
              <div className="facts">
                <div className="fact">
                  <div className="ic">⛶</div>
                  <div>
                    <div className="ft">{v!.sqft.toLocaleString()} sq ft</div>
                    <div className="fd">Usable event area</div>
                  </div>
                </div>
                <div className="fact">
                  <div className="ic">⚑</div>
                  <div>
                    <div className="ft">
                      {v!.seated} seated · {v!.standing} standing
                    </div>
                    <div className="fd">Capacity</div>
                  </div>
                </div>
                <div className="fact">
                  <div className="ic">⏱</div>
                  <div>
                    <div className="ft">
                      {shortestHours > 0 ? `From ${shortestHours}-hr blocks` : "Flexible blocks"}
                    </div>
                    <div className="fd">Flexible scheduling</div>
                  </div>
                </div>
                <div className="fact">
                  <div className="ic">✦</div>
                  <div>
                    <div className="ft">{v!.depositPct}% deposit</div>
                    <div className="fd">To reserve the date</div>
                  </div>
                </div>
              </div>
            </div>

            {Object.keys(layouts).length > 0 && (
              <div className="dsec">
                <h3>Layouts &amp; capacities</h3>
                <div className="layouts">
                  {Object.entries(layouts).map(([k, n]) => (
                    <div className="lay" key={k}>
                      <div className="num">{n}</div>
                      <div className="lt">{k}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {included.length > 0 && (
              <div className="dsec">
                <h3>What&apos;s included</h3>
                <div className="incl">
                  {included.map((i, idx) => (
                    <div key={idx}>
                      <span className="ck">✓</span> {i}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {hasCoords && (
              <div className="dsec">
                <h3>Where you&apos;ll be</h3>
                <div className="maddr">
                  {v!.hotel.address || v!.hotel.city}
                  {v!.hotel.region ? `, ${v!.hotel.region}` : ""}
                  {v!.hotel.country ? `, ${v!.hotel.country}` : ""}
                </div>
                <div className="mapwrap">
                  <HotelMap
                    lat={v!.hotel.latitude as number}
                    lng={v!.hotel.longitude as number}
                    label={v!.hotel.name}
                  />
                </div>
              </div>
            )}

            <div className="dsec" style={{ borderBottom: "none" }}>
              <h3>Terms &amp; considerations</h3>
              {rules.cancel && (
                <details className="acc" open>
                  <summary>
                    Cancellation policy <span>+</span>
                  </summary>
                  <p>{rules.cancel}</p>
                </details>
              )}
              {rules.time && (
                <details className="acc">
                  <summary>
                    Hours &amp; scheduling <span>+</span>
                  </summary>
                  <p>{rules.time}</p>
                </details>
              )}
              {rules.catering && (
                <details className="acc">
                  <summary>
                    Catering &amp; vendors <span>+</span>
                  </summary>
                  <p>{rules.catering}</p>
                </details>
              )}
              {rules.min && (
                <details className="acc">
                  <summary>
                    Minimum spend <span>+</span>
                  </summary>
                  <p>{rules.min}</p>
                </details>
              )}
            </div>
          </div>

          <div className="bookwrap">
            {booked ? (
              <div className="book">
                <div className="booked">
                  ✓ Request sent. Your deposit holds the date while {v!.hotel.name} confirms
                  availability — Offsite only earns its fee once your booking clears.
                </div>
                <Link
                  href={`/venues/${v!.id}`}
                  className="btn-emerald"
                  style={{ width: "100%", textAlign: "center" }}
                >
                  Make another request
                </Link>
              </div>
            ) : pricingOptions.length === 0 ? (
              <div className="book">
                <div style={{ color: "var(--ink-2)" }}>
                  Pricing isn&apos;t live for this venue yet. Check back shortly.
                </div>
              </div>
            ) : (
              <BookingForm
                venueId={v!.id}
                pricingOptions={pricingOptions}
                depositPct={v!.depositPct}
                rating="New"
                unavailableDates={unavailableDates}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
