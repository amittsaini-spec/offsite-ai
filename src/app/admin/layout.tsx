import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { logoutAction } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");

  return (
    <div className="admin">
      <aside className="aside">
        <div>
          <Link href="/" className="logo">
            offsite<b>.ai</b>
          </Link>
          <div className="role">Agent console</div>
        </div>
        <nav className="anav">
          <Link href="/admin">Dashboard</Link>
          <Link href="/admin/hotels/new">+ New hotel</Link>
          <Link href="/admin/bookings">Booking requests</Link>
          <Link href="/venues">View marketplace ↗</Link>
        </nav>
        <div className="who">
          {user.name}
          <form action={logoutAction}>
            <button className="logout" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <main className="amain">{children}</main>
    </div>
  );
}
