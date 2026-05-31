import Link from "next/link";
import { prisma } from "@/lib/db";
import {
  parseArray,
  parseSearchPlaceholders,
  parseValueCards,
} from "@/lib/data";
import {
  updateCtaBandAction,
  updateFooterAction,
} from "@/lib/actions";
import HeroSettingsEditor from "./HeroSettingsEditor";
import HomeCollectionsEditor from "./HomeCollectionsEditor";
import ValueCardsEditor from "./ValueCardsEditor";
import HomeSectionsEditor from "./HomeSectionsEditor";

export const dynamic = "force-dynamic";

const SUCCESS_LABELS: Record<string, string> = {
  hero: "Hero saved.",
  collections: "Shop by Moment saved.",
  valueCards: "Value cards saved.",
  sections: "Sections saved.",
  cta: "CTA band saved.",
  footer: "Footer saved.",
};
const ERROR_LABELS: Record<string, string> = {
  "collections-bad-json":
    "Couldn't parse the collections payload — please refresh and try again.",
  "collections-not-array":
    "Collections data was malformed — please refresh and try again.",
  "valueCards-bad-json":
    "Couldn't parse the value-cards payload — please refresh and try again.",
  "valueCards-not-array":
    "Value-cards data was malformed — please refresh and try again.",
  "sections-bad-json":
    "Couldn't parse the sections payload — please refresh and try again.",
  "sections-not-array":
    "Sections data was malformed — please refresh and try again.",
};

const TOC = [
  { id: "hero", label: "Hero" },
  { id: "value", label: "Value strip" },
  { id: "collections", label: "Shop by Moment" },
  { id: "sections", label: "Sections" },
  { id: "cta", label: "CTA band" },
  { id: "footer", label: "Footer" },
];

export default async function Homepage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { saved, error } = await searchParams;

  const [site, collections, sections] = await Promise.all([
    prisma.siteSettings.findUnique({ where: { id: "home" } }),
    prisma.homeCollection.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.homeSection.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  const heroInitial = {
    heroEyebrow: site?.heroEyebrow ?? "",
    heroHeadline: site?.heroHeadline ?? "",
    heroSubhead: site?.heroSubhead ?? "",
    heroMediaType: site?.heroMediaType ?? "none",
    heroMedia: parseArray(site?.heroMedia ?? "[]"),
    heroVideoEmbed: site?.heroVideoEmbed ?? "",
    heroPoster: site?.heroPoster ?? "",
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

  const valueInitial = parseValueCards(site?.valueCards ?? "[]");

  const sectionsInitial = sections.map((s) => {
    const ft = ["tag", "type", "featured"].includes(s.filterType)
      ? (s.filterType as "tag" | "type" | "featured")
      : "tag";
    return {
      id: s.id,
      title: s.title,
      subtitle: s.subtitle,
      filterType: ft,
      filterValue: s.filterValue,
      enabled: s.enabled,
    };
  });

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

      {/* Quick anchor jumps — six panels makes the page tall. */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          marginBottom: 22,
        }}
      >
        {TOC.map((t) => (
          <a key={t.id} href={`#${t.id}`} className="fchip">
            {t.label}
          </a>
        ))}
      </div>

      <div id="hero" className="panel" style={{ marginBottom: 22, scrollMarginTop: 80 }}>
        <h3>Hero</h3>
        <div style={{ padding: 22 }}>
          <HeroSettingsEditor initial={heroInitial} />
        </div>
      </div>

      <div id="value" className="panel" style={{ marginBottom: 22, scrollMarginTop: 80 }}>
        <h3>
          Value strip{" "}
          <span style={{ color: "var(--muted)", fontWeight: 400 }}>
            ({valueInitial.length} card{valueInitial.length === 1 ? "" : "s"})
          </span>
        </h3>
        <div style={{ padding: 22 }}>
          <ValueCardsEditor initial={valueInitial} />
        </div>
      </div>

      <div id="collections" className="panel" style={{ marginBottom: 22, scrollMarginTop: 80 }}>
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

      <div id="sections" className="panel" style={{ marginBottom: 22, scrollMarginTop: 80 }}>
        <h3>
          Sections{" "}
          <span style={{ color: "var(--muted)", fontWeight: 400 }}>
            ({sectionsInitial.length} feed
            {sectionsInitial.length === 1 ? "" : "s"})
          </span>
        </h3>
        <div style={{ padding: 22 }}>
          <HomeSectionsEditor initial={sectionsInitial} />
        </div>
      </div>

      <div id="cta" className="panel" style={{ marginBottom: 22, scrollMarginTop: 80 }}>
        <h3>CTA band</h3>
        <div style={{ padding: 22 }}>
          <form action={updateCtaBandAction} className="formcard">
            <div className="field">
              <label>Headline</label>
              <input
                className="input"
                name="ctaHeadline"
                defaultValue={site?.ctaHeadline ?? ""}
                placeholder="Own a venue that's empty more than it should be?"
              />
            </div>
            <div className="field">
              <label>Body</label>
              <textarea
                className="textarea"
                name="ctaBody"
                rows={4}
                defaultValue={site?.ctaBody ?? ""}
              />
            </div>
            <div className="fgrid">
              <div className="field">
                <label>Button label</label>
                <input
                  className="input"
                  name="ctaButtonLabel"
                  defaultValue={site?.ctaButtonLabel ?? ""}
                  placeholder="Partner with us →"
                />
              </div>
              <div className="field">
                <label>Button link</label>
                <input
                  className="input"
                  name="ctaButtonLink"
                  defaultValue={site?.ctaButtonLink ?? ""}
                  placeholder="/login"
                />
              </div>
            </div>
            <button
              className="submit"
              type="submit"
              style={{ maxWidth: 220, marginTop: 12 }}
            >
              Save CTA →
            </button>
          </form>
        </div>
      </div>

      <div id="footer" className="panel" style={{ marginBottom: 22, scrollMarginTop: 80 }}>
        <h3>Footer</h3>
        <div style={{ padding: 22 }}>
          <form action={updateFooterAction} className="formcard">
            <div className="field">
              <label>Footer tagline</label>
              <input
                className="input"
                name="footerTagline"
                defaultValue={site?.footerTagline ?? ""}
                placeholder="A DestaLabs company · Cancún pilot · We win when they win."
              />
            </div>
            <button
              className="submit"
              type="submit"
              style={{ maxWidth: 220, marginTop: 12 }}
            >
              Save footer →
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
