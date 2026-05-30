import Link from "next/link";
import { gradFor, parseArray, fmt } from "@/lib/data";

type V = {
  id: string;
  name: string;
  type: string;
  standing: number;
  sqft: number;
  basePrice: number;
  tags: string;
  hotel: { name: string; city: string };
};

export default function VenueCard({ v }: { v: V }) {
  const tags = parseArray(v.tags);
  const hot = tags.includes("Hot Pick");
  return (
    <Link href={`/venues/${v.id}`} className="card">
      <div className="cmedia" style={{ background: gradFor(v.type) }}>
        {hot ? (
          <span className="ctag hot">🔥 Hot Pick</span>
        ) : (
          <span className="ctag">{v.type}</span>
        )}
        <span className="c360">◎ 360° tour</span>
      </div>
      <div className="cbody">
        <div className="crow">
          <div>
            <div className="chotel">{v.hotel.name}</div>
            <div className="cname">{v.name}</div>
          </div>
        </div>
        <div className="cloc">⚲ {v.hotel.city}</div>
        <div className="cmeta">
          <span>
            Up to <b>{v.standing}</b> guests
          </span>
          <span>
            <b>{v.sqft.toLocaleString()}</b> sq ft
          </span>
        </div>
        <div className="cprice">
          <b>{fmt(v.basePrice)}</b> · per 4-hr block
        </div>
      </div>
    </Link>
  );
}
