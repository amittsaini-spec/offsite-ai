import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { VENUE_TYPES } from "@/lib/data";
import { createVenueAction } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function NewVenue({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const hotel = await prisma.hotel.findUnique({ where: { id } });
  if (!hotel) notFound();

  return (
    <>
      <Link href={`/admin/hotels/${hotel!.id}`} className="back">
        ← {hotel!.name}
      </Link>
      <div className="ah1" style={{ marginTop: 10 }}>
        Add a venue
      </div>
      <div className="asub" style={{ marginBottom: 26 }}>
        Listing for {hotel!.name}
      </div>

      <form action={createVenueAction} className="formcard">
        <input type="hidden" name="hotelId" value={hotel!.id} />

        <div className="fgrid">
          <div className="field">
            <label>Venue name</label>
            <input className="input" name="name" placeholder="The Tropical Garden" required />
          </div>
          <div className="field">
            <label>Type</label>
            <select className="input" name="type" defaultValue="Garden">
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
            placeholder="What makes this space special?"
          />
        </div>

        <div className="fgrid3">
          <div className="field">
            <label>Seated</label>
            <input className="input" name="seated" type="number" min={0} defaultValue={150} />
          </div>
          <div className="field">
            <label>Standing</label>
            <input className="input" name="standing" type="number" min={0} defaultValue={250} />
          </div>
          <div className="field">
            <label>Sq ft</label>
            <input className="input" name="sqft" type="number" min={0} defaultValue={6000} />
          </div>
        </div>

        <div className="fgrid3">
          <div className="field">
            <label>Base price (4-hr block)</label>
            <input className="input" name="basePrice" type="number" min={0} defaultValue={18000} />
          </div>
          <div className="field">
            <label>Deposit %</label>
            <input className="input" name="depositPct" type="number" min={0} max={100} defaultValue={25} />
          </div>
          <div className="field">
            <label>Status</label>
            <select className="input" name="status" defaultValue="PUBLISHED">
              <option>PUBLISHED</option>
              <option>DRAFT</option>
            </select>
          </div>
        </div>

        <div className="field">
          <label>Tags (comma separated)</label>
          <input className="input" name="tags" placeholder="Hot Pick, Garden Venues" />
        </div>

        <div className="fsec">Capacity by layout</div>
        <div className="fgrid3">
          {["Ceremony", "Banquet", "Theatre", "Cocktail", "Classroom", "Lounge"].map((k) => (
            <div className="field" key={k}>
              <label>{k}</label>
              <input className="input" name={"layout_" + k} type="number" min={0} placeholder="0" />
            </div>
          ))}
        </div>

        <div className="fsec">What&apos;s included (one per line)</div>
        <textarea
          className="textarea"
          name="included"
          placeholder={"On-site coordinator\nTables, chairs & linens\nGarden lighting"}
        />

        <div className="fsec">Terms &amp; considerations</div>
        <div className="field">
          <label>Cancellation policy</label>
          <textarea className="textarea" name="rule_cancel" style={{ minHeight: 60 }} />
        </div>
        <div className="field">
          <label>Hours &amp; scheduling</label>
          <textarea className="textarea" name="rule_time" style={{ minHeight: 60 }} />
        </div>
        <div className="field">
          <label>Catering &amp; vendors</label>
          <textarea className="textarea" name="rule_catering" style={{ minHeight: 60 }} />
        </div>
        <div className="field">
          <label>Minimum spend</label>
          <textarea className="textarea" name="rule_min" style={{ minHeight: 60 }} />
        </div>

        <button className="submit" type="submit" style={{ maxWidth: 240, marginTop: 20 }}>
          Publish venue →
        </button>
      </form>
    </>
  );
}
