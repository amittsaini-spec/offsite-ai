import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import Sidebar from "./_components/Sidebar";

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
      <Sidebar userName={user.name} />
      <main className="amain">{children}</main>
    </div>
  );
}
