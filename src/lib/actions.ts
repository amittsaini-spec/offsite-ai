"use server";

import { prisma } from "./db";
import { createSession, destroySession, getCurrentUser } from "./auth";
import { quote, parsePricingOptions } from "./data";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

function str(fd: FormData, key: string) {
  return (fd.get(key) ?? "").toString().trim();
}
function int(fd: FormData, key: string) {
  const n = parseInt((fd.get(key) ?? "").toString(), 10);
  return Number.isFinite(n) ? n : 0;
}
function intOrNull(fd: FormData, key: string): number | null {
  const raw = (fd.get(key) ?? "").toString().trim();
  if (!raw) return null;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}
function floatOrNull(fd: FormData, key: string): number | null {
  const raw = (fd.get(key) ?? "").toString().trim();
  if (!raw) return null;
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : null;
}
function multi(fd: FormData, key: string): string[] {
  return fd.getAll(key).map((v) => v.toString().trim()).filter(Boolean);
}
// Strict URL-array parser for media fields posted as a JSON string.
function urlArray(fd: FormData, key: string): string[] {
  const raw = (fd.get(key) ?? "").toString().trim();
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v)
      ? v.map((s) => String(s ?? "").trim()).filter(Boolean)
      : [];
  } catch {
    return [];
  }
}
function lines(fd: FormData, key: string) {
  return str(fd, key)
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}
function csv(fd: FormData, key: string) {
  return str(fd, key)
    .split(",")
    .map((l) => l.trim())
    .filter(Boolean);
}

/* ---------- AUTH ---------- */

export async function loginAction(formData: FormData) {
  const email = str(formData, "email").toLowerCase();
  const password = str(formData, "password");
  const next = str(formData, "next") || "/admin";

  const user = await prisma.user.findUnique({ where: { email } });
  const ok = user && (await bcrypt.compare(password, user.passwordHash));
  if (!user || !ok) {
    redirect("/login?error=1");
  }
  await createSession({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });
  redirect(next.startsWith("/admin") ? next : "/admin");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

/* ---------- HOTELS ---------- */

export async function createHotelAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const hotel = await prisma.hotel.create({
    data: {
      name: str(formData, "name"),
      brand: str(formData, "brand"),
      description: str(formData, "description"),
      address: str(formData, "address"),
      city: str(formData, "city"),
      region: str(formData, "region"),
      country: str(formData, "country"),
      zone: str(formData, "zone"),
      latitude: floatOrNull(formData, "latitude"),
      longitude: floatOrNull(formData, "longitude"),
      contactName: str(formData, "contactName"),
      contactEmail: str(formData, "contactEmail"),
      contactPhone: str(formData, "contactPhone"),
      website: str(formData, "website"),
      amenities: JSON.stringify(multi(formData, "amenities")),
      starRating: intOrNull(formData, "starRating"),
      createdById: user!.id,
    },
  });
  revalidatePath("/admin");
  redirect(`/admin/hotels/${hotel.id}`);
}

export async function updateHotelAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const id = str(formData, "id");
  if (!id) redirect("/admin");

  await prisma.hotel.update({
    where: { id },
    data: {
      name: str(formData, "name"),
      brand: str(formData, "brand"),
      description: str(formData, "description"),
      address: str(formData, "address"),
      city: str(formData, "city"),
      region: str(formData, "region"),
      country: str(formData, "country"),
      zone: str(formData, "zone"),
      latitude: floatOrNull(formData, "latitude"),
      longitude: floatOrNull(formData, "longitude"),
      contactName: str(formData, "contactName"),
      contactEmail: str(formData, "contactEmail"),
      contactPhone: str(formData, "contactPhone"),
      website: str(formData, "website"),
      amenities: JSON.stringify(multi(formData, "amenities")),
      starRating: intOrNull(formData, "starRating"),
    },
  });

  revalidatePath("/admin");
  revalidatePath(`/admin/hotels/${id}`);
  revalidatePath("/venues");
  redirect(`/admin/hotels/${id}`);
}

export async function deleteHotelAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const id = str(formData, "id");
  if (!id) redirect("/admin");

  // Guard: refuse if any venue under this hotel has a CONFIRMED booking.
  const confirmedCount = await prisma.bookingRequest.count({
    where: { status: "CONFIRMED", venue: { hotelId: id } },
  });
  if (confirmedCount > 0) {
    redirect(`/admin/hotels/${id}?error=hotel-has-confirmed-bookings`);
  }

  // Capture venue ids before cascading delete so we can revalidate their public pages.
  const venues = await prisma.venue.findMany({
    where: { hotelId: id },
    select: { id: true },
  });
  await prisma.hotel.delete({ where: { id } });

  revalidatePath("/admin");
  revalidatePath("/venues");
  for (const v of venues) revalidatePath(`/venues/${v.id}`);
  redirect("/admin");
}

/* ---------- VENUES ---------- */

export async function createVenueAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const hotelId = str(formData, "hotelId");

  const layouts: Record<string, number> = {};
  for (const key of ["Ceremony", "Banquet", "Theatre", "Cocktail", "Classroom", "Lounge"]) {
    const v = int(formData, "layout_" + key);
    if (v > 0) layouts[key] = v;
  }

  const rules = {
    cancel: str(formData, "rule_cancel"),
    time: str(formData, "rule_time"),
    catering: str(formData, "rule_catering"),
    min: str(formData, "rule_min"),
  };

  const pricingOptions = parsePricingOptions(str(formData, "pricingOptions"));

  await prisma.venue.create({
    data: {
      hotelId,
      name: str(formData, "name"),
      type: str(formData, "type") || "Garden",
      description: str(formData, "description"),
      sqft: int(formData, "sqft"),
      seated: int(formData, "seated"),
      standing: int(formData, "standing"),
      depositPct: int(formData, "depositPct") || 25,
      status: str(formData, "status") || "PUBLISHED",
      tags: JSON.stringify(csv(formData, "tags")),
      included: JSON.stringify(lines(formData, "included")),
      layouts: JSON.stringify(layouts),
      rules: JSON.stringify(rules),
      pricingOptions: JSON.stringify(pricingOptions),
      photos: JSON.stringify(urlArray(formData, "photos")),
      videoUrl: str(formData, "videoUrl"),
      tourUrl: str(formData, "tourUrl"),
      floorPlans: JSON.stringify(urlArray(formData, "floorPlans")),
    },
  });
  revalidatePath("/admin");
  revalidatePath(`/admin/hotels/${hotelId}`);
  revalidatePath("/venues");
  redirect(`/admin/hotels/${hotelId}`);
}

export async function updateVenueAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const id = str(formData, "id");
  if (!id) redirect("/admin");

  const layouts: Record<string, number> = {};
  for (const key of ["Ceremony", "Banquet", "Theatre", "Cocktail", "Classroom", "Lounge"]) {
    const v = int(formData, "layout_" + key);
    if (v > 0) layouts[key] = v;
  }

  const rules = {
    cancel: str(formData, "rule_cancel"),
    time: str(formData, "rule_time"),
    catering: str(formData, "rule_catering"),
    min: str(formData, "rule_min"),
  };

  const pricingOptions = parsePricingOptions(str(formData, "pricingOptions"));

  const updated = await prisma.venue.update({
    where: { id },
    data: {
      name: str(formData, "name"),
      type: str(formData, "type") || "Garden",
      description: str(formData, "description"),
      sqft: int(formData, "sqft"),
      seated: int(formData, "seated"),
      standing: int(formData, "standing"),
      depositPct: int(formData, "depositPct") || 25,
      status: str(formData, "status") || "PUBLISHED",
      tags: JSON.stringify(csv(formData, "tags")),
      included: JSON.stringify(lines(formData, "included")),
      layouts: JSON.stringify(layouts),
      rules: JSON.stringify(rules),
      pricingOptions: JSON.stringify(pricingOptions),
      photos: JSON.stringify(urlArray(formData, "photos")),
      videoUrl: str(formData, "videoUrl"),
      tourUrl: str(formData, "tourUrl"),
      floorPlans: JSON.stringify(urlArray(formData, "floorPlans")),
    },
  });

  revalidatePath("/admin");
  revalidatePath(`/admin/hotels/${updated.hotelId}`);
  revalidatePath("/venues");
  revalidatePath(`/venues/${id}`);
  redirect(`/admin/hotels/${updated.hotelId}`);
}

export async function deleteVenueAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const id = str(formData, "id");
  if (!id) redirect("/admin");

  const venue = await prisma.venue.findUnique({
    where: { id },
    select: { hotelId: true },
  });
  if (!venue) redirect("/admin");

  // Guard: refuse if any CONFIRMED bookings exist on this venue.
  const confirmedCount = await prisma.bookingRequest.count({
    where: { venueId: id, status: "CONFIRMED" },
  });
  if (confirmedCount > 0) {
    redirect(`/admin/hotels/${venue!.hotelId}?error=venue-has-confirmed-bookings`);
  }

  await prisma.venue.delete({ where: { id } });

  revalidatePath("/admin");
  revalidatePath(`/admin/hotels/${venue!.hotelId}`);
  revalidatePath("/venues");
  revalidatePath(`/venues/${id}`);
  redirect(`/admin/hotels/${venue!.hotelId}`);
}

/* ---------- BOOKINGS (public, concierge-first: no charge yet) ---------- */

export async function createBookingAction(formData: FormData) {
  const venueId = str(formData, "venueId");
  const optionIndex = int(formData, "pricingOptionIndex");

  const venue = await prisma.venue.findUnique({ where: { id: venueId } });
  if (!venue) redirect("/venues");

  const options = parsePricingOptions(venue!.pricingOptions);
  const chosen = options[optionIndex] ?? options[0];
  if (!chosen) redirect(`/venues/${venueId}`);

  const q = quote(chosen!.price, venue!.depositPct);

  await prisma.bookingRequest.create({
    data: {
      venueId,
      guestName: str(formData, "guestName"),
      guestEmail: str(formData, "guestEmail"),
      eventType: str(formData, "eventType") || "Wedding",
      eventDate: str(formData, "eventDate"),
      guests: int(formData, "guests"),
      tierLabel: chosen!.label,
      basePrice: q.base,
      serviceFee: q.serviceFee,
      depositDue: q.depositDue,
      total: q.total,
    },
  });

  // STRIPE SEAM: this is where a Stripe Connect PaymentIntent (manual capture)
  // would place a hold for q.depositDue and route the split payout to the hotel.
  // For the concierge-first launch we just record the request and notify the team.

  revalidatePath("/admin/bookings");
  redirect(`/venues/${venueId}?booked=1`);
}

export async function setBookingStatusAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const id = str(formData, "id");
  const status = str(formData, "status");
  await prisma.bookingRequest.update({ where: { id }, data: { status } });
  revalidatePath("/admin/bookings");
}
