import Link from "next/link";

export default function SiteNav() {
  return (
    <nav className="nav">
      <div className="nav-in">
        <Link href="/" className="logo">
          offsite<b>.ai</b>
        </Link>
        <span className="loc-pill">⚲ Cancún · Riviera Maya</span>
        <span className="nav-sp" />
        <Link href="/venues" className="nav-link">
          Browse venues
        </Link>
        <Link href="/login" className="btn-ghost">
          Team login
        </Link>
        <Link href="/venues" className="btn-fill">
          Find a venue
        </Link>
      </div>
    </nav>
  );
}
