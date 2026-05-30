import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { fmt, gradFor } from "@/lib/data";
import { deleteVenueAction } from "@/lib/actions";
import ConfirmDeleteButton from "@/app/_components/ConfirmDeleteButton";

export const dynamic = "force-dynamic";

export default async function HotelDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const hotel = await prisma.hotel.findUnique({
    where: { id },
    include: { venues: { orderBy: { createdAt: "desc" } } },
  });
  if (!hotel) notFound();

  return (
    <>
      <Link href="/admin" className="back">
        ← Dashboard
      </Link>
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
        <p style={{ color: "var(--ink-2)", maxWidth: 620, marginBottom: 26 }}>
          {hotel!.description}
        </p>
      )}

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
                <span style={{ fontWeight: 600 }}>{fmt(v.basePrice)}</span>
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
