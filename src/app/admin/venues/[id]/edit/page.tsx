import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { VENUE_TYPES, parseArray, parseObj, parsePricingOptions, parseDateArray } from "@/lib/data";
import { updateVenueAction, deleteVenueAction } from "@/lib/actions";
import ConfirmDeleteButton from "@/app/_components/ConfirmDeleteButton";
import PricingOptionsEditor from "@/app/admin/_components/PricingOptionsEditor";
import VenueMediaEditor from "@/app/admin/_components/VenueMediaEditor";
import BlackoutCalendar from "@/app/admin/_components/BlackoutCalendar";

export const dynamic = "force-dynamic";

export default async function EditVenue({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const venue = await prisma.venue.findUnique({
    where: { id },
    include: {
      hotel: true,
      bookings: {
        where: { status: "CONFIRMED" },
        select: { eventDate: true },
      },
    },
  });
  if (!venue) notFound();

  const tags = parseArray(venue!.tags).join(", ");
  const included = parseArray(venue!.included).join("\n");
  const layouts = parseObj(venue!.layouts) as Record<string, number>;
  const rules = parseObj(venue!.rules) as Record<string, string>;
  const pricingOptions = parsePricingOptions(venue!.pricingOptions);
  const photos = parseArray(venue!.photos);
  const floorPlans = parseArray(venue!.floorPlans);
  const blackouts = parseDateArray(venue!.blackoutDates);
  const confirmedDates = Array.from(
    new Set(
      venue!.bookings
        .map((b) => b.eventDate)
        .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)),
    ),
  );

  return (
    <>
      <Link href={`/admin/hotels/${venue!.hotel.id}`} className="back">
        ← {venue!.hotel.name}
      </Link>
      <div className="atop" style={{ marginTop: 10 }}>
        <div>
          <div className="ah1">Edit venue</div>
          <div className="asub">Listing for {venue!.hotel.name}</div>
        </div>
        <ConfirmDeleteButton
          action={deleteVenueAction}
          id={venue!.id}
          confirmText={`Delete "${venue!.name}" and all of its booking requests? This cannot be undone.`}
        >
          Delete venue
        </ConfirmDeleteButton>
      </div>

      <form action={updateVenueAction} className="formcard">
        <input type="hidden" name="id" value={venue!.id} />

        <div className="fgrid">
          <div className="field">
            <label>Venue name</label>
            <input
              className="input"
              name="name"
              defaultValue={venue!.name}
              required
            />
          </div>
          <div className="field">
            <label>Type</label>
            <select className="input" name="type" defaultValue={venue!.type}>
              {VENUE_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="field">
          <label>Description</label>
          <textarea
            className="textarea"
            name="description"
            defaultValue={venue!.description}
          />
        </div>

        <div className="fgrid3">
          <div className="field">
            <label>Seated</label>
            <input
              className="input"
              name="seated"
              type="number"
              min={0}
              defaultValue={venue!.seated}
            />
          </div>
          <div className="field">
            <label>Standing</label>
            <input
              className="input"
              name="standing"
              type="number"
              min={0}
              defaultValue={venue!.standing}
            />
          </div>
          <div className="field">
            <label>Sq ft</label>
            <input
              className="input"
              name="sqft"
              type="number"
              min={0}
              defaultValue={venue!.sqft}
            />
          </div>
        </div>

        <div className="fgrid">
          <div className="field">
            <label>Deposit %</label>
            <input
              className="input"
              name="depositPct"
              type="number"
              min={0}
              max={100}
              defaultValue={venue!.depositPct}
            />
          </div>
          <div className="field">
            <label>Status</label>
            <select className="input" name="status" defaultValue={venue!.status}>
              <option>PUBLISHED</option>
              <option>DRAFT</option>
            </select>
          </div>
        </div>

        <div className="fsec">Pricing options</div>
        <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 12 }}>
          Define one or more booking options. Guests pick one at checkout.
        </div>
        <PricingOptionsEditor initial={pricingOptions} />

        <div className="fsec" style={{ marginTop: 28 }}>Availability</div>
        <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 12 }}>
          Click a date to toggle a blackout. Confirmed bookings (in emerald) are read-only.
        </div>
        <BlackoutCalendar
          initialBlackouts={blackouts}
          confirmedDates={confirmedDates}
        />

        <div className="fsec" style={{ marginTop: 28 }}>Photos</div>
        <VenueMediaEditor
          initialPhotos={photos}
          initialVideoUrl={venue!.videoUrl}
          initialTourUrl={venue!.tourUrl}
          initialFloorPlans={floorPlans}
        />

        <div className="field">
          <label>Tags (comma separated)</label>
          <input className="input" name="tags" defaultValue={tags} />
        </div>

        <div className="fsec">Capacity by layout</div>
        <div className="fgrid3">
          {["Ceremony", "Banquet", "Theatre", "Cocktail", "Classroom", "Lounge"].map((k) => (
            <div className="field" key={k}>
              <label>{k}</label>
              <input
                className="input"
                name={"layout_" + k}
                type="number"
                min={0}
                defaultValue={layouts[k] ?? ""}
                placeholder="0"
              />
            </div>
          ))}
        </div>

        <div className="fsec">What&apos;s included (one per line)</div>
        <textarea
          className="textarea"
          name="included"
          defaultValue={included}
          placeholder={"On-site coordinator\nTables, chairs & linens\nGarden lighting"}
        />

        <div className="fsec">Terms &amp; considerations</div>
        <div className="field">
          <label>Cancellation policy</label>
          <textarea
            className="textarea"
            name="rule_cancel"
            style={{ minHeight: 60 }}
            defaultValue={rules.cancel ?? ""}
          />
        </div>
        <div className="field">
          <label>Hours &amp; scheduling</label>
          <textarea
            className="textarea"
            name="rule_time"
            style={{ minHeight: 60 }}
            defaultValue={rules.time ?? ""}
          />
        </div>
        <div className="field">
          <label>Catering &amp; vendors</label>
          <textarea
            className="textarea"
            name="rule_catering"
            style={{ minHeight: 60 }}
            defaultValue={rules.catering ?? ""}
          />
        </div>
        <div className="field">
          <label>Minimum spend</label>
          <textarea
            className="textarea"
            name="rule_min"
            style={{ minHeight: 60 }}
            defaultValue={rules.min ?? ""}
          />
        </div>

        <button className="submit" type="submit" style={{ maxWidth: 240, marginTop: 20 }}>
          Save changes →
        </button>
      </form>
    </>
  );
}
