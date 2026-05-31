"use client";

import { useRouter } from "next/navigation";

export type CategoryPill = { label: string; href: string; primary?: boolean };

// Renders the hero pills and intercepts clicks to inherit whatever market
// is currently selected in the WHERE dropdown (#hero-where). Reads the
// select via the DOM at click time rather than maintaining its own React
// state — simplest reliable way to share one value with one consumer
// without restructuring the hero into a single client tree.
//
// SSR fallback: each pill's <a href> is the static "no inheritance" URL,
// so the pills still work if JS is disabled. The market is only appended
// when JS is live and a value is picked.
export default function HeroPills({ pills }: { pills: CategoryPill[] }) {
  const router = useRouter();

  function onClick(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
    e.preventDefault();
    const select = document.getElementById("hero-where") as
      | HTMLSelectElement
      | null;
    const market = select?.value ?? "";
    const url = new URL(href, window.location.origin);
    if (market) url.searchParams.set("market", market);
    router.push(url.pathname + url.search);
  }

  return (
    <div className="hero-pills">
      {pills.map((p) => (
        <a
          key={p.label}
          href={p.href}
          className={"hero-pill" + (p.primary ? " primary" : "")}
          onClick={(e) => onClick(e, p.href)}
        >
          {p.label}
        </a>
      ))}
    </div>
  );
}
