// One-time backfill: any Venue with empty pricingOptions gets a default
// 3-option set derived from its legacy basePrice. Idempotent — re-running
// is safe; it skips venues that already have options.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const venues = await prisma.venue.findMany({
    select: { id: true, name: true, basePrice: true, pricingOptions: true },
  });

  let updated = 0;
  let skipped = 0;

  for (const v of venues) {
    let parsed: unknown = [];
    try {
      parsed = JSON.parse(v.pricingOptions);
    } catch {
      parsed = [];
    }
    const hasOptions = Array.isArray(parsed) && parsed.length > 0;

    if (hasOptions) {
      skipped++;
      continue;
    }

    if (v.basePrice <= 0) {
      // Nothing to derive from; leave empty so the agent fills it in via the form.
      skipped++;
      continue;
    }

    const options = [
      { label: "Half-day · 4 hours", durationHours: 4, price: v.basePrice },
      { label: "Full-day · 8 hours", durationHours: 8, price: Math.round(v.basePrice * 1.8) },
      { label: "Full takeover · 12 hours", durationHours: 12, price: Math.round(v.basePrice * 2.5) },
    ];

    await prisma.venue.update({
      where: { id: v.id },
      data: { pricingOptions: JSON.stringify(options) },
    });
    updated++;
    console.log(`  ✓ ${v.name} → ${options.length} options (base $${v.basePrice})`);
  }

  console.log(`\nBackfill complete. Updated: ${updated}. Skipped: ${skipped}.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
