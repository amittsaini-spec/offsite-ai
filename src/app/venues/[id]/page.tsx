import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { gradFor, parseArray, parseObj } from "@/lib/data";
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
  const grad = gradFor(v!.type);

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
          <div style={{ background: grad }}>
            <span className="gtag">◎ Launch 360° virtual tour</span>
          </div>
          <div style={{ background: grad, filter: "hue-rotate(12deg) brightness(1.05)" }} />
          <div style={{ background: grad, filter: "hue-rotate(-14deg) brightness(.92)" }} />
          <div style={{ background: grad, filter: "saturate(1.3) brightness(1.08)" }}>
            <span className="gtag">Layout renderings</span>
          </div>
          <div style={{ background: grad, filter: "hue-rotate(20deg) brightness(.96)" }}>
            <span className="gtag">+ photos</span>
          </div>
        </div>

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
                    <div className="ft">4-hr blocks</div>
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
            ) : (
              <BookingForm
                venueId={v!.id}
                basePrice={v!.basePrice}
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
