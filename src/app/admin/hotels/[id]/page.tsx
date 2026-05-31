import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { fmt, gradFor, fromPrice, parseArray } from "@/lib/data";
import { deleteVenueAction } from "@/lib/actions";
import ConfirmDeleteButton from "@/app/_components/ConfirmDeleteButton";

export const dynamic = "force-dynamic";

function ProfileField({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: ".04em",
          textTransform: "uppercase",
          color: "var(--muted)",
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 14.5, color: "var(--ink)" }}>{value}</div>
    </div>
  );
}

const ERROR_MESSAGES: Record<string, string> = {
  "hotel-has-confirmed-bookings":
    "Can't delete this hotel — one or more venues have CONFIRMED bookings. Decline or complete them first.",
  "venue-has-confirmed-bookings":
    "Can't delete that venue — it has CONFIRMED bookings. Decline or complete them first.",
};

export default async function HotelDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const hotel = await prisma.hotel.findUnique({
    where: { id },
    include: { venues: { orderBy: { createdAt: "desc" } } },
  });
  if (!hotel) notFound();

  const errorMessage = error ? ERROR_MESSAGES[error] : null;
  const amenities = parseArray(hotel!.amenities);

  return (
    <>
      <Link href="/admin" className="back">
        ← Dashboard
      </Link>

      {errorMessage && (
        <div
          style={{
            marginTop: 14,
            padding: "12px 16px",
            borderRadius: 12,
            background: "#fbe9e4",
            color: "var(--coral-d)",
            fontWeight: 500,
            fontSize: 14,
          }}
        >
          {errorMessage}
        </div>
      )}
      <div className="atop" style={{ marginTop: 10 }}>
        <div>
          <div className="ah1">{hotel!.name}</div>
          <div className="asub">
            {hotel!.city}
            {hotel!.zone ? ` · ${hotel!.zone}` : ""}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Link href={`/admin/hotels/${hotel!.id}/edit`} className="btn-ghost">
            Edit hotel
          </Link>
          <Link href={`/admin/hotels/${hotel!.id}/venues/new`} className="btn-emerald">
            + Add venue
          </Link>
        </div>
      </div>

      {hotel!.description && (
        <p style={{ color: "var(--ink-2)", maxWidth: 620, marginTop: 14, marginBottom: 18 }}>
          {hotel!.description}
        </p>
      )}

      <div className="panel" style={{ marginBottom: 22 }}>
        <h3>Profile</h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 18,
            padding: "18px 20px",
          }}
        >
          {hotel!.brand && <ProfileField label="Brand" value={hotel!.brand} />}
          {hotel!.starRating && (
            <ProfileField label="Rating" value={`${hotel!.starRating} stars`} />
          )}
          <ProfileField label="Market" value={hotel!.market} />
          {hotel!.address && <ProfileField label="Address" value={hotel!.address} />}
          {(hotel!.region || hotel!.country) && (
            <ProfileField
              label="Region · Country"
              value={[hotel!.region, hotel!.country].filter(Boolean).join(" · ")}
            />
          )}
          {hotel!.latitude != null && hotel!.longitude != null && (
            <ProfileField
              label="Coordinates"
              value={`${hotel!.latitude.toFixed(4)}, ${hotel!.longitude.toFixed(4)}`}
            />
          )}
          {hotel!.contactName && (
            <ProfileField label="Contact" value={hotel!.contactName} />
          )}
          {hotel!.contactEmail && (
            <ProfileField label="Email" value={hotel!.contactEmail} />
          )}
          {hotel!.contactPhone && (
            <ProfileField label="Phone" value={hotel!.contactPhone} />
          )}
          {hotel!.website && (
            <ProfileField
              label="Website"
              value={
                <a
                  href={hotel!.website}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "var(--emerald)" }}
                >
                  {hotel!.website.replace(/^https?:\/\//, "")} ↗
                </a>
              }
            />
          )}
        </div>
        {amenities.length > 0 && (
          <div style={{ padding: "0 20px 20px" }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: ".04em",
                textTransform: "uppercase",
                color: "var(--muted)",
                marginBottom: 8,
              }}
            >
              Amenities
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {amenities.map((a) => (
                <span key={a} className="pill draft">
                  {a}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="panel">
        <h3>Venues ({hotel!.venues.length})</h3>
        {hotel!.venues.length === 0 ? (
          <div className="empty">
            No venues yet.{" "}
            <Link
              href={`/admin/hotels/${hotel!.id}/venues/new`}
              style={{ color: "var(--emerald)", fontWeight: 600 }}
            >
              Add the first venue →
            </Link>
          </div>
        ) : (
          hotel!.venues.map((v) => (
            <div key={v.id} className="trow">
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  background: gradFor(v.type),
                  flexShrink: 0,
                }}
              />
              <div>
                <div className="tmain">{v.name}</div>
                <div className="tsub">
                  {v.type} · up to {v.standing} guests
                </div>
              </div>
              <div className="tsp" style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontWeight: 600 }}>
                  from {fmt(fromPrice(v.pricingOptions, v.basePrice))}
                </span>
                <span className={"pill " + (v.status === "PUBLISHED" ? "ok" : "draft")}>
                  {v.status}
                </span>
                <Link href={`/venues/${v.id}`} className="tsub" style={{ color: "var(--emerald)" }}>
                  View ↗
                </Link>
                <Link
                  href={`/admin/venues/${v.id}/edit`}
                  className="pill draft"
                  style={{ textTransform: "uppercase" }}
                >
                  Edit
                </Link>
                <ConfirmDeleteButton
                  action={deleteVenueAction}
                  id={v.id}
                  confirmText={`Delete "${v.name}" and all of its booking requests? This cannot be undone.`}
                  className="pill no"
                >
                  Delete
                </ConfirmDeleteButton>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
