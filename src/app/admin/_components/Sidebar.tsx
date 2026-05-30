"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/lib/actions";

const NAV = [
  { href: "/admin", label: "Overview", match: "exact" as const },
  { href: "/admin/bookings", label: "Bookings" },
  { href: "/admin/availability", label: "Calendar" },
  { href: "/admin/hotels", label: "Hotels & Venues" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/revenue", label: "Revenue" },
  { href: "/admin/users", label: "Team" },
];

export default function Sidebar({
  userName,
}: {
  userName: string;
}) {
  const path = usePathname();

  function isActive(href: string, match?: "exact") {
    if (match === "exact") return path === href;
    return path === href || path.startsWith(href + "/");
  }

  return (
    <aside className="aside">
      <div>
        <Link href="/" className="logo">
          offsite<b>.ai</b>
        </Link>
        <div className="role">Agent console</div>
      </div>
      <nav className="anav">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={isActive(item.href, item.match) ? "active" : ""}
          >
            {item.label}
          </Link>
        ))}
        <div style={{ height: 14 }} />
        <Link href="/venues" target="_blank" rel="noopener" style={{ fontSize: 13, opacity: 0.7 }}>
          View marketplace ↗
        </Link>
      </nav>
      <div className="who">
        {userName}
        <form action={logoutAction}>
          <button className="logout" type="submit">
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
