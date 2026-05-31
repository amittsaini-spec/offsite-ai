"use server";

import { prisma } from "./db";
import { createSession, destroySession, getCurrentUser } from "./auth";
import {
  quote,
  parsePricingOptions,
  canTransition,
  parseNotes,
  BLOCKING_STATUSES,
} from "./data";
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
// Strict YYYY-MM-DD-array parser for the blackout calendar.
function dateArray(fd: FormData, key: string): string[] {
  const raw = (fd.get(key) ?? "").toString().trim();
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    if (!Array.isArray(v)) return [];
    return Array.from(
      new Set(
        v
          .map((x) => String(x ?? "").trim())
          .filter((x) => /^\d{4}-\d{2}-\d{2}$/.test(x)),
      ),
    ).sort();
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

  // Guard: refuse if any venue under this hotel has a non-terminal locked booking.
  const blockedCount = await prisma.bookingRequest.count({
    where: { status: { in: BLOCKING_STATUSES }, venue: { hotelId: id } },
  });
  if (blockedCount > 0) {
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
      blackoutDates: JSON.stringify(dateArray(formData, "blackoutDates")),
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
      blackoutDates: JSON.stringify(dateArray(formData, "blackoutDates")),
    },
  });

  revalidatePath("/admin");
  revalidatePath(`/admin/hotels/${updated.hotelId}`);
  revalidatePath("/venues");
  revalidatePath(`/venues/${id}`);
  redirect(`/admin/hotels/${updated.hotelId}`);
}

// Narrow availability-only update used by /admin/availability. Doesn't
// touch any other venue field, so safe to call from a calendar UI that
// only knows about blackouts.
export async function updateVenueAvailabilityAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const id = str(formData, "id");
  if (!id) redirect("/admin/availability");

  const blackouts = dateArray(formData, "blackoutDates");
  const updated = await prisma.venue.update({
    where: { id },
    data: { blackoutDates: JSON.stringify(blackouts) },
    select: { hotelId: true },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/availability");
  revalidatePath(`/admin/hotels/${updated.hotelId}`);
  revalidatePath(`/admin/venues/${id}/edit`);
  revalidatePath("/venues");
  revalidatePath(`/venues/${id}`);
  redirect(`/admin/availability?venue=${id}&saved=1`);
}

// Quick PUBLISHED <-> DRAFT toggle for the hotels & venues table.
export async function toggleVenueStatusAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const id = str(formData, "id");
  if (!id) redirect("/admin/hotels");

  const current = await prisma.venue.findUnique({
    where: { id },
    select: { status: true, hotelId: true },
  });
  if (!current) redirect("/admin/hotels");

  const next = current!.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
  await prisma.venue.update({ where: { id }, data: { status: next } });

  revalidatePath("/admin");
  revalidatePath("/admin/hotels");
  revalidatePath(`/admin/hotels/${current!.hotelId}`);
  revalidatePath("/venues");
  revalidatePath(`/venues/${id}`);
  redirect("/admin/hotels");
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

  // Guard: refuse if any non-terminal locked booking exists on this venue.
  const blockedCount = await prisma.bookingRequest.count({
    where: { venueId: id, status: { in: BLOCKING_STATUSES } },
  });
  if (blockedCount > 0) {
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

/* ---------- HOME-PAGE CMS ---------- */

const ALLOWED_HERO_MEDIA_TYPES = new Set(["none", "image", "video", "slideshow"]);

// Partial update of the singleton SiteSettings row. Every field is
// optional in the form — only what's posted gets written, defaults left
// in place.
export async function updateSiteSettingsAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const mediaTypeRaw = str(formData, "heroMediaType");
  const heroMediaType = ALLOWED_HERO_MEDIA_TYPES.has(mediaTypeRaw)
    ? mediaTypeRaw
    : "none";

  // Media URLs come in as a hidden JSON input the picker keeps in sync.
  const heroMedia = JSON.stringify(urlArray(formData, "heroMedia"));

  // Search placeholders are a 4-field object posted as discrete inputs.
  const searchPlaceholders = JSON.stringify({
    where: str(formData, "ph_where"),
    event: str(formData, "ph_event"),
    date: str(formData, "ph_date"),
    guests: str(formData, "ph_guests"),
  });

  await prisma.siteSettings.upsert({
    where: { id: "home" },
    update: {
      heroEyebrow: str(formData, "heroEyebrow"),
      heroHeadline: str(formData, "heroHeadline"),
      heroSubhead: str(formData, "heroSubhead"),
      heroMediaType,
      heroMedia,
      heroVideoEmbed: str(formData, "heroVideoEmbed"),
      searchPlaceholders,
    },
    create: {
      id: "home",
      heroEyebrow: str(formData, "heroEyebrow"),
      heroHeadline: str(formData, "heroHeadline"),
      heroSubhead: str(formData, "heroSubhead"),
      heroMediaType,
      heroMedia,
      heroVideoEmbed: str(formData, "heroVideoEmbed"),
      searchPlaceholders,
    },
  });

  revalidatePath("/");
  revalidatePath("/admin/homepage");
  redirect("/admin/homepage?saved=hero");
}

// Replace-all save for the Shop by Moment cards. The form posts a single
// JSON blob from the client editor; we delete the existing rows and
// recreate inside a transaction so the table can never end up partial.
export async function saveHomeCollectionsAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const raw = (formData.get("collections") ?? "").toString();
  let parsed: unknown = [];
  try {
    parsed = JSON.parse(raw);
  } catch {
    redirect("/admin/homepage?error=collections-bad-json");
  }
  if (!Array.isArray(parsed)) {
    redirect("/admin/homepage?error=collections-not-array");
  }

  const rows = (parsed as unknown[])
    .map((r, i) => {
      const o = (r ?? {}) as Record<string, unknown>;
      const linkType = String(o.linkType ?? "type");
      return {
        title: String(o.title ?? "").trim(),
        subtitle: String(o.subtitle ?? "").trim(),
        imageUrl: String(o.imageUrl ?? "").trim(),
        linkType: linkType === "tag" ? "tag" : "type",
        linkValue: String(o.linkValue ?? "").trim(),
        sortOrder: i,
      };
    })
    // Drop completely empty rows so a stray "+ Add card" doesn't persist.
    .filter((r) => r.title || r.subtitle || r.imageUrl);

  await prisma.$transaction([
    prisma.homeCollection.deleteMany({}),
    prisma.homeCollection.createMany({ data: rows }),
  ]);

  revalidatePath("/");
  revalidatePath("/admin/homepage");
  redirect("/admin/homepage?saved=collections");
}

// Value strip — stored as JSON on the singleton settings row, so this is
// a column update rather than a multi-row replace.
export async function saveValueCardsAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const raw = (formData.get("valueCards") ?? "").toString();
  let parsed: unknown = [];
  try {
    parsed = JSON.parse(raw);
  } catch {
    redirect("/admin/homepage?error=valueCards-bad-json");
  }
  if (!Array.isArray(parsed)) {
    redirect("/admin/homepage?error=valueCards-not-array");
  }

  const cards = (parsed as unknown[])
    .map((r) => {
      const o = (r ?? {}) as Record<string, unknown>;
      return {
        figure: String(o.figure ?? "").trim(),
        title: String(o.title ?? "").trim(),
        desc: String(o.desc ?? "").trim(),
      };
    })
    .filter((c) => c.figure || c.title || c.desc);

  await prisma.siteSettings.upsert({
    where: { id: "home" },
    update: { valueCards: JSON.stringify(cards) },
    create: { id: "home", valueCards: JSON.stringify(cards) },
  });

  revalidatePath("/");
  revalidatePath("/admin/homepage");
  redirect("/admin/homepage?saved=valueCards");
}

// Venue-feed Sections — separate model, replace-all transaction.
export async function saveHomeSectionsAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const raw = (formData.get("sections") ?? "").toString();
  let parsed: unknown = [];
  try {
    parsed = JSON.parse(raw);
  } catch {
    redirect("/admin/homepage?error=sections-bad-json");
  }
  if (!Array.isArray(parsed)) {
    redirect("/admin/homepage?error=sections-not-array");
  }

  const allowedFilters = new Set(["tag", "type", "featured"]);
  const rows = (parsed as unknown[])
    .map((r, i) => {
      const o = (r ?? {}) as Record<string, unknown>;
      const filterType = String(o.filterType ?? "tag");
      return {
        title: String(o.title ?? "").trim(),
        subtitle: String(o.subtitle ?? "").trim(),
        filterType: allowedFilters.has(filterType) ? filterType : "tag",
        filterValue: String(o.filterValue ?? "").trim(),
        enabled: o.enabled !== false,
        sortOrder: i,
      };
    })
    .filter((r) => r.title || r.subtitle);

  await prisma.$transaction([
    prisma.homeSection.deleteMany({}),
    prisma.homeSection.createMany({ data: rows }),
  ]);

  revalidatePath("/");
  revalidatePath("/admin/homepage");
  redirect("/admin/homepage?saved=sections");
}

// CTA band — 4 plain text fields, narrow update.
export async function updateCtaBandAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const data = {
    ctaHeadline: str(formData, "ctaHeadline"),
    ctaBody: str(formData, "ctaBody"),
    ctaButtonLabel: str(formData, "ctaButtonLabel"),
    ctaButtonLink: str(formData, "ctaButtonLink"),
  };

  await prisma.siteSettings.upsert({
    where: { id: "home" },
    update: data,
    create: { id: "home", ...data },
  });

  revalidatePath("/");
  revalidatePath("/admin/homepage");
  redirect("/admin/homepage?saved=cta");
}

// Footer tagline — single text field, narrow update.
export async function updateFooterAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const footerTagline = str(formData, "footerTagline");

  await prisma.siteSettings.upsert({
    where: { id: "home" },
    update: { footerTagline },
    create: { id: "home", footerTagline },
  });

  revalidatePath("/");
  revalidatePath("/admin/homepage");
  redirect("/admin/homepage?saved=footer");
}

/* ---------- payouts (concierge-first; Stripe seam noted inline) ---------- */

// Flips a booking's payoutStatus between PENDING and PAID, with the
// matching payoutPaidAt timestamp set or cleared. Only COMPLETED bookings
// are payout-eligible — the action refuses otherwise so we can't pay out
// before the event happened.
export async function togglePayoutAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const id = str(formData, "id");
  if (!id) redirect("/admin/revenue");

  const booking = await prisma.bookingRequest.findUnique({
    where: { id },
    select: {
      status: true,
      payoutStatus: true,
      venue: { select: { hotelId: true } },
    },
  });
  if (!booking) redirect("/admin/revenue");
  if (booking!.status !== "COMPLETED") {
    redirect(`/admin/revenue/${booking!.venue.hotelId}?error=not-completed`);
  }

  const nextStatus = booking!.payoutStatus === "PAID" ? "PENDING" : "PAID";
  const nextPaidAt = nextStatus === "PAID" ? new Date() : null;

  // STRIPE SEAM: with Stripe Connect this is where we'd issue
  //   stripe.transfers.create({ amount: net, currency: 'usd',
  //     destination: hotel.stripeAccountId, transfer_group: booking.id })
  // and only flip payoutStatus on the resulting transfer.id. For the
  // concierge launch we record the manual ACH / wire here and trust the
  // operator.
  await prisma.bookingRequest.update({
    where: { id },
    data: { payoutStatus: nextStatus, payoutPaidAt: nextPaidAt },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/revenue");
  revalidatePath(`/admin/revenue/${booking!.venue.hotelId}`);
  redirect(`/admin/revenue/${booking!.venue.hotelId}?saved=1`);
}

/* ---------- team management ---------- */

const STRONG_PASSWORD_MIN = 8;

export async function createTeamMemberAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const name = str(formData, "name");
  const email = str(formData, "email").toLowerCase();
  const password = str(formData, "password");
  const roleRaw = str(formData, "role");
  const role = roleRaw === "ADMIN" ? "ADMIN" : "AGENT";

  if (!name || !email || !password) {
    redirect("/admin/users?error=missing-fields");
  }
  if (password.length < STRONG_PASSWORD_MIN) {
    redirect("/admin/users?error=weak-password");
  }

  // Email uniqueness is enforced by the schema, but checking explicitly
  // lets us redirect with a friendly message instead of a 500.
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    redirect("/admin/users?error=email-exists");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: { name, email, passwordHash, role },
  });

  revalidatePath("/admin/users");
  redirect("/admin/users?saved=created");
}

export async function setUserRoleAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const id = str(formData, "id");
  const role = str(formData, "role");
  if (id === user!.id) {
    redirect("/admin/users?error=self-demote");
  }

  const next = role === "ADMIN" ? "ADMIN" : "AGENT";

  // If demoting an ADMIN, ensure we're not removing the last one.
  if (next === "AGENT") {
    const currentAdmins = await prisma.user.count({ where: { role: "ADMIN" } });
    const target = await prisma.user.findUnique({
      where: { id },
      select: { role: true },
    });
    if (target?.role === "ADMIN" && currentAdmins <= 1) {
      redirect("/admin/users?error=last-admin");
    }
  }

  await prisma.user.update({ where: { id }, data: { role: next } });
  revalidatePath("/admin/users");
  redirect("/admin/users?saved=role");
}

export async function deleteUserAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const id = str(formData, "id");
  if (!id) redirect("/admin/users");
  if (id === user!.id) {
    redirect("/admin/users?error=self-delete");
  }

  // Refuse to delete the last admin so an ops mistake can't lock everyone out.
  const target = await prisma.user.findUnique({
    where: { id },
    select: { role: true },
  });
  if (!target) redirect("/admin/users");
  if (target!.role === "ADMIN") {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    if (adminCount <= 1) redirect("/admin/users?error=last-admin");
  }

  // Belt-and-suspenders: null the FK on any hotels they created before
  // deleting the user, in case the schema's onDelete: SetNull hasn't been
  // applied yet in this database.
  await prisma.hotel.updateMany({
    where: { createdById: id },
    data: { createdById: null },
  });
  await prisma.user.delete({ where: { id } });

  revalidatePath("/admin/users");
  redirect("/admin/users?saved=deleted");
}

/* ---------- bookings ---------- */

export async function setBookingStatusAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const id = str(formData, "id");
  const nextStatus = str(formData, "status");

  // Validate the transition is allowed by the workflow state machine.
  // Loads the current status first so we can refuse illegal moves cleanly.
  const current = await prisma.bookingRequest.findUnique({
    where: { id },
    select: { status: true, venueId: true },
  });
  if (!current) redirect("/admin/bookings");
  if (!canTransition(current!.status, nextStatus)) {
    redirect(`/admin/bookings/${id}?error=invalid-transition`);
  }

  await prisma.bookingRequest.update({
    where: { id },
    data: { status: nextStatus },
  });

  // Status flips can move dates onto/off the unavailable list — refresh
  // every surface that reads availability.
  revalidatePath("/admin");
  revalidatePath("/admin/bookings");
  revalidatePath(`/admin/bookings/${id}`);
  revalidatePath("/admin/availability");
  revalidatePath(`/venues/${current!.venueId}`);
  redirect(`/admin/bookings/${id}`);
}

export async function addBookingNoteAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const id = str(formData, "id");
  const text = str(formData, "text");
  if (!id || !text) redirect(`/admin/bookings/${id}`);

  const current = await prisma.bookingRequest.findUnique({
    where: { id },
    select: { notes: true },
  });
  if (!current) redirect("/admin/bookings");

  const notes = parseNotes(current!.notes);
  notes.push({
    author: user!.name || user!.email,
    text,
    at: new Date().toISOString(),
  });

  await prisma.bookingRequest.update({
    where: { id },
    data: { notes: JSON.stringify(notes) },
  });

  revalidatePath(`/admin/bookings/${id}`);
  redirect(`/admin/bookings/${id}`);
}
