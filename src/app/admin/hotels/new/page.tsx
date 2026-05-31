import Link from "next/link";
import { createHotelAction } from "@/lib/actions";
import { AMENITIES, MARKETS, DEFAULT_MARKET } from "@/lib/data";
import HotelAddressFields from "@/app/admin/_components/HotelAddressFields";

export default function NewHotel() {
  return (
    <>
      <Link href="/admin" className="back">
        ← Dashboard
      </Link>
      <div className="ah1" style={{ marginTop: 10 }}>
        New hotel profile
      </div>
      <div className="asub" style={{ marginBottom: 26 }}>
        Create the hotel, then add its venues.
      </div>

      <form action={createHotelAction} className="formcard">
        {/* ── Profile ─────────────────────────────────────────────── */}
        <div className="fsec">Profile</div>
        <div className="fgrid">
          <div className="field">
            <label>Hotel name</label>
            <input
              className="input"
              name="name"
              placeholder="JW Marriott Cancún Resort & Spa"
              required
            />
          </div>
          <div className="field">
            <label>Brand / chain (optional)</label>
            <input className="input" name="brand" placeholder="Marriott" />
          </div>
        </div>
        <div className="fgrid">
          <div className="field">
            <label>Star rating</label>
            <select className="input" name="starRating" defaultValue="">
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
              placeholder="https://…"
            />
          </div>
        </div>
        <div className="field">
          <label>Description</label>
          <textarea
            className="textarea"
            name="description"
            placeholder="A short positioning line for the property."
          />
        </div>

        {/* ── Location ────────────────────────────────────────────── */}
        <div className="fsec">Location</div>
        <div className="field">
          <label>Market</label>
          <select
            className="input"
            name="market"
            defaultValue={DEFAULT_MARKET}
            required
          >
            {MARKETS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <HotelAddressFields initial={{}} />
        <div className="field" style={{ marginTop: 14 }}>
          <label>Zone / sub-area (optional)</label>
          <input className="input" name="zone" placeholder="Punta Cancún" />
        </div>

        {/* ── Contact ─────────────────────────────────────────────── */}
        <div className="fsec">Contact</div>
        <div className="fgrid">
          <div className="field">
            <label>Contact name</label>
            <input className="input" name="contactName" placeholder="Events Manager" />
          </div>
          <div className="field">
            <label>Contact email</label>
            <input className="input" name="contactEmail" type="email" />
          </div>
        </div>
        <div className="field">
          <label>Contact phone</label>
          <input className="input" name="contactPhone" placeholder="+52 …" />
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
              <input type="checkbox" name="amenities" value={a} />
              {a}
            </label>
          ))}
        </div>

        <button
          className="submit"
          type="submit"
          style={{ maxWidth: 240, marginTop: 24 }}
        >
          Create hotel →
        </button>
      </form>
    </>
  );
}
