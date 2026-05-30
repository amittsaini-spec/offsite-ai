import Link from "next/link";
import { prisma } from "@/lib/db";
import { parseArray, parseSearchPlaceholders } from "@/lib/data";
import HeroSettingsEditor from "./HeroSettingsEditor";
import HomeCollectionsEditor from "./HomeCollectionsEditor";

export const dynamic = "force-dynamic";

const SUCCESS_LABELS: Record<string, string> = {
  hero: "Hero saved.",
  collections: "Shop by Moment saved.",
};
const ERROR_LABELS: Record<string, string> = {
  "collections-bad-json":
    "Couldn't parse the collections payload — please refresh and try again.",
  "collections-not-array":
    "Collections data was malformed — please refresh and try again.",
};

export default async function Homepage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { saved, error } = await searchParams;

  const [site, collections] = await Promise.all([
    prisma.siteSettings.findUnique({ where: { id: "home" } }),
    prisma.homeCollection.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  // Normalize the singleton — if the row is missing, hand the editor
  // sensible empty defaults so it never crashes on first render.
  const heroInitial = {
    heroEyebrow: site?.heroEyebrow ?? "",
    heroHeadline: site?.heroHeadline ?? "",
    heroSubhead: site?.heroSubhead ?? "",
    heroMediaType: site?.heroMediaType ?? "none",
    heroMedia: parseArray(site?.heroMedia ?? "[]"),
    heroVideoEmbed: site?.heroVideoEmbed ?? "",
    searchPlaceholders: parseSearchPlaceholders(site?.searchPlaceholders ?? "{}"),
  };

  const collectionsInitial = collections.map((c) => ({
    id: c.id,
    title: c.title,
    subtitle: c.subtitle,
    imageUrl: c.imageUrl,
    linkType: (c.linkType === "tag" ? "tag" : "type") as "tag" | "type",
    linkValue: c.linkValue,
  }));

  return (
    <>
      <div className="atop">
        <div>
          <div className="ah1">Homepage</div>
          <div className="asub">
            Edit every section of the public home page. Changes are live the moment
            you save.
          </div>
        </div>
        <Link href="/" target="_blank" rel="noopener" className="btn-ghost">
          View live ↗
        </Link>
      </div>

      {saved && SUCCESS_LABELS[saved] && (
        <div
          style={{
            marginBottom: 18,
            padding: "10px 14px",
            background: "#e2efe7",
            color: "var(--emerald)",
            borderRadius: 10,
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          ✓ {SUCCESS_LABELS[saved]}
        </div>
      )}
      {error && ERROR_LABELS[error] && (
        <div
          style={{
            marginBottom: 18,
            padding: "10px 14px",
            background: "#fbe9e4",
            color: "var(--coral-d)",
            borderRadius: 10,
            fontWeight: 500,
            fontSize: 14,
          }}
        >
          {ERROR_LABELS[error]}
        </div>
      )}

      <div className="panel" style={{ marginBottom: 22 }}>
        <h3>Hero</h3>
        <div style={{ padding: 22 }}>
          <HeroSettingsEditor initial={heroInitial} />
        </div>
      </div>

      <div className="panel">
        <h3>
          Shop by Moment{" "}
          <span style={{ color: "var(--muted)", fontWeight: 400 }}>
            ({collectionsInitial.length} card
            {collectionsInitial.length === 1 ? "" : "s"})
          </span>
        </h3>
        <div style={{ padding: 22 }}>
          <HomeCollectionsEditor initial={collectionsInitial} />
        </div>
      </div>
    </>
  );
}
