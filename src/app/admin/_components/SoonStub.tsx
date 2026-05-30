import Link from "next/link";

// Tiny placeholder used by sections that get built in later Phase 5
// checkpoints, so the sidebar nav is fully clickable for review.
export default function SoonStub({
  title,
  checkpoint,
  blurb,
}: {
  title: string;
  checkpoint: string;
  blurb: string;
}) {
  return (
    <>
      <div className="atop">
        <div>
          <div className="ah1">{title}</div>
          <div className="asub">Coming in {checkpoint}.</div>
        </div>
        <Link href="/admin" className="btn-ghost">
          ← Back to Overview
        </Link>
      </div>
      <div className="panel">
        <div className="empty">{blurb}</div>
      </div>
    </>
  );
}
