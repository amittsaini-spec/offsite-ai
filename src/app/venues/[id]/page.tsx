import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { gradFor, parseArray, parseObj, parsePricingOptions, embedFromUrl } from "@/lib/data";
import SiteNav from "../../_components/SiteNav";
import BookingForm from "./BookingForm";

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
    include: { hotel: true },
  });
  if (!v) notFound();

  const tags = parseArray(v!.tags);
  const included = parseArray(v!.included);
  const layouts = parseObj(v!.layouts) as Record<string, number>;
  const rules = parseObj(v!.rules) as Record<string, string>;
  const pricingOptions = parsePricingOptions(v!.pricingOptions);
  const photos = parseArray(v!.photos);
  const floorPlans = parseArray(v!.floorPlans);
  const grad = gradFor(v!.type);
  const embed = embedFromUrl(v!.videoUrl);
  // Shortest available block, used in the "scheduling" fact card.
  const shortestHours = pricingOptions.length
    ? Math.min(...pricingOptions.map((o) => o.durationHours).filter((h) => h > 0))
    : 0;

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

        <div className="dgallery">
          {/* Cover slot: real photo or fallback gradient with the 360 CTA on top */}
          <div
            style={{
              background: grad,
              backgroundImage: photos[0] ? `url(${photos[0]})` : grad,
              backgroundSize: "cover",
              backgroundPosition: "center",
              position: "relative",
            }}
          >
            {v!.tourUrl && (
              <a
                href={v!.tourUrl}
                target="_blank"
                rel="noreferrer"
                className="gtag"
                style={{ background: "rgba(0,0,0,.55)", color: "#fff", border: "none" }}
              >
                ◎ Launch 360° virtual tour
              </a>
            )}
          </div>

          {/* Up to 4 supporting cells: extra photos, then floor plans, then nothing */}
          {[1, 2, 3, 4].map((i) => {
            const photo = photos[i];
            const floor = floorPlans[i - 1 - Math.max(photos.length - 1, 0)];
            const src = photo ?? floor;
            const isFloor = !photo && !!floor;
            return (
              <div
                key={i}
                style={{
                  background: grad,
                  backgroundImage: src ? `url(${src})` : grad,
                  backgroundSize: isFloor ? "contain" : "cover",
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "center",
                  filter: src ? undefined : `hue-rotate(${i * 11}deg)`,
                }}
              >
                {isFloor && <span className="gtag">Layout renderings</span>}
              </div>
            );
          })}
        </div>

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
                <Link href={`/venues/${v!.id}`} className="btn-emerald" style={{ width: "100%", textAlign: "center" }}>
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
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
