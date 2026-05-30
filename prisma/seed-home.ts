// Idempotent seed for the home-page CMS. Mirrors the copy / structure
// that used to be hardcoded in src/app/page.tsx so the public home page
// renders identically once switched over to the database.
//
// Safe to re-run: upserts the singleton SiteSettings row and only creates
// HomeCollection / HomeSection rows when none exist.
//
// Two entry points:
//   - As a script:  `npm run db:seed-home` (for existing installs).
//   - As a function: imported by prisma/seed.ts so fresh installs get it
//     automatically alongside the hotel / venue sample data.

import { PrismaClient } from "@prisma/client";

const SITE_DEFAULTS = {
  id: "home",
  heroEyebrow: "Now live · Cancún test market",
  // *asterisk-wrapped* words render as <em> on the public page.
  heroHeadline: "The hotel's most beautiful spaces, *finally* bookable.",
  heroSubhead:
    "Search idle venue inventory across Cancún's best resorts — gardens, beachfronts, ballrooms and rooftops. Compare pricing, see the rules, and hold your date with a deposit. No all-inclusive room block required.",
  heroMediaType: "none",
  heroMedia: JSON.stringify([]),
  heroVideoEmbed: "",
  searchPlaceholders: JSON.stringify({
    where: "Cancún · Riviera Maya",
    event: "Wedding ceremony",
    date: "Add dates",
    guests: "120 guests",
  }),
  valueCards: JSON.stringify([
    {
      figure: "$0",
      title: "upfront for hotels",
      desc: "We only earn a % when your venue books. We win when you win.",
    },
    {
      figure: "4 hrs",
      title: "of idle garden = revenue",
      desc: "A space sitting empty is a $20k line item waiting to be claimed.",
    },
    {
      figure: "1 click",
      title: "from search to deposit",
      desc:
        "Browse, compare policies, hold a date — the Airbnb flow, for venues.",
    },
  ]),
  ctaHeadline: "Own a venue that's empty more than it should be?",
  ctaBody:
    "List it on Offsite at zero cost. Set your own price, your own rules, your own blackout dates. You keep full control — we just bring you demand you weren't reaching. You only pay when you get paid.",
  ctaButtonLabel: "Partner with us →",
  ctaButtonLink: "/login",
  footerTagline: "A DestaLabs company · Cancún pilot · We win when they win.",
};

const COLLECTION_DEFAULTS = [
  { title: "For the ceremony", subtitle: "Garden Ceremonies", linkType: "type", linkValue: "Garden", sortOrder: 0 },
  { title: "For the reception", subtitle: "Beachfront Receptions", linkType: "type", linkValue: "Beachfront", sortOrder: 1 },
  { title: "For business", subtitle: "Boardrooms with a View", linkType: "type", linkValue: "Ballroom", sortOrder: 2 },
  { title: "For the night", subtitle: "Rooftop Celebrations", linkType: "type", linkValue: "Rooftop", sortOrder: 3 },
];

const SECTION_DEFAULTS = [
  {
    title: "Hot picks in Cancún",
    subtitle: "The venues groups are reserving right now",
    filterType: "tag",
    filterValue: "Hot Pick",
    sortOrder: 0,
    enabled: true,
  },
  {
    title: "Garden venues",
    subtitle: "Lawns, courtyards and tropical gardens",
    filterType: "type",
    filterValue: "Garden",
    sortOrder: 1,
    enabled: true,
  },
];

export async function seedHomeDefaults(prisma: PrismaClient) {
  const existing = await prisma.siteSettings.findUnique({ where: { id: "home" } });
  if (!existing) {
    await prisma.siteSettings.create({ data: SITE_DEFAULTS });
    console.log("  ✓ SiteSettings created");
  } else {
    console.log("  · SiteSettings already exists — left as-is");
  }

  const collectionCount = await prisma.homeCollection.count();
  if (collectionCount === 0) {
    await prisma.homeCollection.createMany({ data: COLLECTION_DEFAULTS });
    console.log(`  ✓ HomeCollection seeded with ${COLLECTION_DEFAULTS.length} rows`);
  } else {
    console.log(`  · HomeCollection has ${collectionCount} rows — left as-is`);
  }

  const sectionCount = await prisma.homeSection.count();
  if (sectionCount === 0) {
    await prisma.homeSection.createMany({ data: SECTION_DEFAULTS });
    console.log(`  ✓ HomeSection seeded with ${SECTION_DEFAULTS.length} rows`);
  } else {
    console.log(`  · HomeSection has ${sectionCount} rows — left as-is`);
  }
}

// Script entry — only runs when invoked directly (e.g. via tsx).
if (require.main === module) {
  const prisma = new PrismaClient();
  seedHomeDefaults(prisma)
    .then(() => {
      console.log("\nHome CMS seed complete.");
      return prisma.$disconnect();
    })
    .catch(async (e) => {
      console.error(e);
      await prisma.$disconnect();
      process.exit(1);
    });
}
