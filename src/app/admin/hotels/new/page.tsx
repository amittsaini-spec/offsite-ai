import Link from "next/link";
import { createHotelAction } from "@/lib/actions";

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
        <div className="field">
          <label>Hotel name</label>
          <input className="input" name="name" placeholder="JW Marriott Cancún Resort & Spa" required />
        </div>
        <div className="fgrid">
          <div className="field">
            <label>City / area</label>
            <input className="input" name="city" placeholder="Hotel Zone, Cancún" required />
          </div>
          <div className="field">
            <label>Zone (optional)</label>
            <input className="input" name="zone" placeholder="Punta Cancún" />
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
        <button className="submit" type="submit" style={{ maxWidth: 240 }}>
          Create hotel →
        </button>
      </form>
    </>
  );
}
