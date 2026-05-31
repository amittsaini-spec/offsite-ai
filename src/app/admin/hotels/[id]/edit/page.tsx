import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { updateHotelAction, deleteHotelAction } from "@/lib/actions";
import { AMENITIES, MARKETS, parseArray, normalizeMarket } from "@/lib/data";
import ConfirmDeleteButton from "@/app/_components/ConfirmDeleteButton";
import HotelAddressFields from "@/app/admin/_components/HotelAddressFields";

export const dynamic = "force-dynamic";

export default async function EditHotel({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const hotel = await prisma.hotel.findUnique({ where: { id } });
  if (!hotel) notFound();

  const amenities = new Set(parseArray(hotel!.amenities));

  return (
    <>
      <Link href={`/admin/hotels/${hotel!.id}`} className="back">
        ← {hotel!.name}
      </Link>
      <div className="atop" style={{ marginTop: 10 }}>
        <div>
          <div className="ah1">Edit hotel</div>
          <div className="asub">Update the profile or remove this hotel.</div>
        </div>
        <ConfirmDeleteButton
          action={deleteHotelAction}
          id={hotel!.id}
          confirmText={`Delete "${hotel!.name}" and ALL of its venues and bookings? This cannot be undone.`}
        >
          Delete hotel
        </ConfirmDeleteButton>
      </div>

      <form action={updateHotelAction} className="formcard">
        <input type="hidden" name="id" value={hotel!.id} />

        {/* ── Profile ─────────────────────────────────────────────── */}
        <div className="fsec">Profile</div>
        <div className="fgrid">
          <div className="field">
            <label>Hotel name</label>
            <input
              className="input"
              name="name"
              defaultValue={hotel!.name}
              required
            />
          </div>
          <div className="field">
            <label>Brand / chain (optional)</label>
            <input className="input" name="brand" defaultValue={hotel!.brand} />
          </div>
        </div>
        <div className="fgrid">
          <div className="field">
            <label>Star rating</label>
            <select
              className="input"
              name="starRating"
              defaultValue={hotel!.starRating?.toString() ?? ""}
            >
              <option value="">—</option>
              <option value="3">3 stars</option>
              <option value="4">4 stars</option>
              <option value="5">5 stars</option>
            </select>
          </div>
          <div className="field">
            <label>Website (optional)</label>
            <input
              className="input"
              name="website"
              type="url"
              defaultValue={hotel!.website}
              placeholder="https://…"
            />
          </div>
        </div>
        <div className="field">
          <label>Description</label>
          <textarea
            className="textarea"
            name="description"
            defaultValue={hotel!.description}
          />
        </div>

        {/* ── Location ────────────────────────────────────────────── */}
        <div className="fsec">Location</div>
        <div className="field">
          <label>Market</label>
          <select
            className="input"
            name="market"
            defaultValue={normalizeMarket(hotel!.market)}
            required
          >
            {MARKETS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <HotelAddressFields
          initial={{
            address: hotel!.address,
            city: hotel!.city,
            region: hotel!.region,
            country: hotel!.country,
            latitude: hotel!.latitude,
            longitude: hotel!.longitude,
          }}
        />
        <div className="field" style={{ marginTop: 14 }}>
          <label>Zone / sub-area (optional)</label>
          <input className="input" name="zone" defaultValue={hotel!.zone} />
        </div>

        {/* ── Contact ─────────────────────────────────────────────── */}
        <div className="fsec">Contact</div>
        <div className="fgrid">
          <div className="field">
            <label>Contact name</label>
            <input
              className="input"
              name="contactName"
              defaultValue={hotel!.contactName}
            />
          </div>
          <div className="field">
            <label>Contact email</label>
            <input
              className="input"
              name="contactEmail"
              type="email"
              defaultValue={hotel!.contactEmail}
            />
          </div>
        </div>
        <div className="field">
          <label>Contact phone</label>
          <input
            className="input"
            name="contactPhone"
            defaultValue={hotel!.contactPhone}
          />
        </div>

        {/* ── Amenities ───────────────────────────────────────────── */}
        <div className="fsec">Amenities</div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: 8,
          }}
        >
          {AMENITIES.map((a) => (
            <label
              key={a}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 10px",
                border: "1px solid var(--line)",
                borderRadius: 10,
                fontSize: 14,
                cursor: "pointer",
                background: "var(--white)",
              }}
            >
              <input
                type="checkbox"
                name="amenities"
                value={a}
                defaultChecked={amenities.has(a)}
              />
              {a}
            </label>
          ))}
        </div>

        <button
          className="submit"
          type="submit"
          style={{ maxWidth: 240, marginTop: 24 }}
        >
          Save changes →
        </button>
      </form>
    </>
  );
}
