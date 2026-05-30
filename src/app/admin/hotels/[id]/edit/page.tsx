import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { updateHotelAction, deleteHotelAction } from "@/lib/actions";
import ConfirmDeleteButton from "@/app/_components/ConfirmDeleteButton";

export const dynamic = "force-dynamic";

export default async function EditHotel({
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

        <div className="field">
          <label>Hotel name</label>
          <input
            className="input"
            name="name"
            defaultValue={hotel!.name}
            required
          />
        </div>
        <div className="fgrid">
          <div className="field">
            <label>City / area</label>
            <input
              className="input"
              name="city"
              defaultValue={hotel!.city}
              required
            />
          </div>
          <div className="field">
            <label>Zone (optional)</label>
            <input
              className="input"
              name="zone"
              defaultValue={hotel!.zone}
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
        <button className="submit" type="submit" style={{ maxWidth: 240 }}>
          Save changes →
        </button>
      </form>
    </>
  );
}
