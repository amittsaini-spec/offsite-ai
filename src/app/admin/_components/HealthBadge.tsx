import Link from "next/link";
import { healthTier, type VenueHealth } from "@/lib/data";

// Compact listing-health pill used on every venue row in the admin
// tables. Rendered as a Link to the venue edit page so a click takes
// the agent straight to where they'd fix things. The list of missing
// items shows on hover via the title attribute — server-rendered,
// works without JS, and isn't clipped by parent overflow:hidden.
export default function HealthBadge({
  venueId,
  health,
}: {
  venueId: string;
  health: VenueHealth;
}) {
  const tier = healthTier(health.score);
  const tooltip =
    health.missing.length === 0
      ? `${health.score}% — listing complete`
      : `${health.score}% complete · Missing: ${health.missing
          .map((m) => m.label)
          .join(" · ")}`;
  return (
    <Link
      href={`/admin/venues/${venueId}/edit`}
      className={`hb-pill hb-${tier}`}
      title={tooltip}
      aria-label={tooltip}
    >
      {health.score}%
    </Link>
  );
}
