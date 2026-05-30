import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL || "admin@destalabs.com").toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD || "destalabs2026";
  const passwordHash = await bcrypt.hash(password, 10);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name: "DestaLabs Team", passwordHash, role: "ADMIN" },
  });
  console.log("Admin ready:", email, "/", password);

  const count = await prisma.hotel.count();
  if (count > 0) {
    console.log("Hotels already seeded, skipping sample data.");
    return;
  }

  const seed = [
    {
      hotel: { name: "JW Marriott Cancún Resort & Spa", city: "Hotel Zone, Cancún", zone: "Punta Cancún", description: "Five-star beachfront resort with the Hotel Zone's most-requested outdoor venues." },
      venues: [
        {
          name: "The Tropical Garden", type: "Garden",
          description: "A canopied tropical garden steps from the Caribbean — string-lit palms, a manicured ceremony lawn, and a private cocktail terrace.",
          sqft: 7200, seated: 180, standing: 300, basePrice: 18000, depositPct: 25,
          tags: ["Hot Pick", "Garden Venues"],
          included: ["On-site event coordinator", "Tables, chairs & house linens", "Garden landscape lighting", "Backup weather plan (indoor ballroom)", "Setup & teardown crew", "Valet parking for 40 vehicles"],
          layouts: { Ceremony: 200, Banquet: 160, Cocktail: 300, Theatre: 220 },
          rules: { cancel: "Full refund up to 90 days out. 50% credit within 90–45 days. Deposit non-refundable inside 45 days.", time: "4-hour blocks. Music must end by 11:00 PM (outdoor noise ordinance).", catering: "In-house catering required for groups over 80. Outside cake permitted with $350 service fee.", min: "Food & beverage minimum of $9,500 applies on weekends." },
        },
      ],
    },
    {
      hotel: { name: "The Ritz-Carlton, Cancún", city: "Hotel Zone, Cancún", zone: "", description: "Refined oceanfront luxury with signature sunset ceremony settings." },
      venues: [
        {
          name: "Oceanfront Terrace", type: "Oceanfront",
          description: "An elevated limestone terrace pitched directly over the surf. Sunset ceremonies here are the resort's signature.",
          sqft: 5400, seated: 120, standing: 200, basePrice: 22000, depositPct: 30,
          tags: ["Hot Pick"],
          included: ["Dedicated maître d'", "Chiavari chairs & premium linens", "Sound system & microphones", "Sunset timing consultation", "Champagne welcome station"],
          layouts: { Ceremony: 140, Banquet: 110, Cocktail: 200, Theatre: 150 },
          rules: { cancel: "Full refund up to 120 days out. 50% within 120–60 days.", time: "4-hour blocks. Two-block minimum for receptions.", catering: "In-house catering exclusive. No outside vendors for F&B.", min: "F&B minimum $14,000 on Fri–Sun." },
        },
      ],
    },
    {
      hotel: { name: "Grand Fiesta Americana Coral Beach", city: "Hotel Zone, Cancún", zone: "", description: "Large-format conference and gala venues in the heart of the Hotel Zone." },
      venues: [
        {
          name: "Sky Ballroom", type: "Ballroom",
          description: "Column-free ballroom on the top floor with floor-to-ceiling glass and a built-in stage.",
          sqft: 9600, seated: 300, standing: 500, basePrice: 24000, depositPct: 30,
          tags: ["Corporate"],
          included: ["A/V package & rigging points", "Stage, podium & lectern", "Conference Wi-Fi (500 Mbps)", "Breakout room access", "Loading dock & freight elevator", "On-site tech engineer"],
          layouts: { Banquet: 300, Theatre: 500, Classroom: 240, Cocktail: 450 },
          rules: { cancel: "50% refundable up to 60 days out.", time: "Full-day and multi-day rates available.", catering: "In-house banquet team. Outside AV vendors permitted with COI.", min: "F&B minimum scales with headcount." },
        },
      ],
    },
    {
      hotel: { name: "Live Aqua Beach Resort", city: "Hotel Zone, Cancún", zone: "", description: "Adults-only resort known for rooftop celebrations." },
      venues: [
        {
          name: "Sunset Rooftop", type: "Rooftop",
          description: "Adults-only rooftop with a glass infinity edge facing due west. Built for cocktail receptions and intimate dinners as the sky turns.",
          sqft: 4200, seated: 100, standing: 160, basePrice: 15500, depositPct: 25,
          tags: ["Hot Pick"],
          included: ["Mixology bar setup", "Lounge furniture & fire features", "DJ booth & sound", "Sunset golden-hour slot priority"],
          layouts: { Cocktail: 160, Banquet: 90, Ceremony: 110, Lounge: 130 },
          rules: { cancel: "Full refund up to 75 days out.", time: "4-hour blocks.", catering: "In-house bar required. Canapé menus available.", min: "Bar minimum $5,500." },
        },
      ],
    },
  ];

  for (const s of seed) {
    const hotel = await prisma.hotel.create({
      data: { ...s.hotel, createdById: admin.id },
    });
    for (const v of s.venues) {
      await prisma.venue.create({
        data: {
          hotelId: hotel.id,
          name: v.name,
          type: v.type,
          description: v.description,
          sqft: v.sqft,
          seated: v.seated,
          standing: v.standing,
          basePrice: v.basePrice,
          depositPct: v.depositPct,
          status: "PUBLISHED",
          tags: JSON.stringify(v.tags),
          included: JSON.stringify(v.included),
          layouts: JSON.stringify(v.layouts),
          rules: JSON.stringify(v.rules),
        },
      });
    }
  }
  console.log("Seeded", seed.length, "hotels with sample venues.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
