import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { relativeTime } from "@/lib/data";
import { setUserRoleAction, deleteUserAction } from "@/lib/actions";
import ConfirmDeleteButton from "@/app/_components/ConfirmDeleteButton";
import InviteForm from "./InviteForm";

export const dynamic = "force-dynamic";

const SUCCESS_LABELS: Record<string, string> = {
  created: "Team member added.",
  role: "Role updated.",
  deleted: "Team member removed.",
};
const ERROR_LABELS: Record<string, string> = {
  "missing-fields": "Name, email, and password are all required.",
  "weak-password": "Password needs to be at least 8 characters.",
  "email-exists": "An account with that email already exists.",
  "self-delete": "You can't remove your own account.",
  "self-demote": "You can't change your own role.",
  "last-admin":
    "There must be at least one admin — promote someone else first.",
};

export default async function Team({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const me = await getCurrentUser();
  const { saved, error } = await searchParams;

  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
    },
  });

  const adminCount = users.filter((u) => u.role === "ADMIN").length;

  return (
    <>
      <div className="atop">
        <div>
          <div className="ah1">Team</div>
          <div className="asub">
            {users.length} member{users.length === 1 ? "" : "s"} ·{" "}
            {adminCount} admin{adminCount === 1 ? "" : "s"}. Agents manage
            inventory and bookings; admins also manage team and payouts.
          </div>
        </div>
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

      <InviteForm />

      <div className="panel">
        <h3>Members</h3>
        {users.length === 0 ? (
          <div className="empty">No team members yet.</div>
        ) : (
          users.map((u) => {
            const isSelf = me?.id === u.id;
            const isAdmin = u.role === "ADMIN";
            const nextRole = isAdmin ? "AGENT" : "ADMIN";
            const lastAdmin = isAdmin && adminCount <= 1;
            return (
              <div key={u.id} className="trow">
                <div>
                  <div className="tmain">
                    {u.name}{" "}
                    {isSelf && (
                      <span
                        style={{
                          color: "var(--muted)",
                          fontWeight: 500,
                          fontSize: 12.5,
                        }}
                      >
                        (You)
                      </span>
                    )}
                  </div>
                  <div className="tsub">
                    {u.email} · joined {relativeTime(u.createdAt)}
                  </div>
                </div>
                <div
                  className="tsp"
                  style={{ display: "flex", alignItems: "center", gap: 10 }}
                >
                  <span
                    className={"pill " + (isAdmin ? "ok" : "draft")}
                    style={{ minWidth: 64, textAlign: "center" }}
                  >
                    {isAdmin ? "Admin" : "Agent"}
                  </span>

                  {/* Role toggle — disabled for self and for the last admin */}
                  <form
                    action={setUserRoleAction}
                    style={{ display: "inline" }}
                  >
                    <input type="hidden" name="id" value={u.id} />
                    <input type="hidden" name="role" value={nextRole} />
                    <button
                      type="submit"
                      className="pill draft"
                      style={{
                        textTransform: "uppercase",
                        cursor: isSelf || lastAdmin ? "not-allowed" : "pointer",
                        opacity: isSelf || lastAdmin ? 0.4 : 1,
                        border: "none",
                      }}
                      disabled={isSelf || lastAdmin}
                      title={
                        isSelf
                          ? "Can't change your own role"
                          : lastAdmin
                            ? "There must be at least one admin"
                            : `Make ${nextRole.toLowerCase()}`
                      }
                    >
                      → {isAdmin ? "Agent" : "Admin"}
                    </button>
                  </form>

                  {/* Delete — disabled for self and for the last admin */}
                  {isSelf || lastAdmin ? (
                    <button
                      type="button"
                      className="pill no"
                      disabled
                      style={{ opacity: 0.4, cursor: "not-allowed", border: "none" }}
                      title={
                        isSelf
                          ? "Can't remove your own account"
                          : "There must be at least one admin"
                      }
                    >
                      Remove
                    </button>
                  ) : (
                    <ConfirmDeleteButton
                      action={deleteUserAction}
                      id={u.id}
                      confirmText={`Remove ${u.name} from the team? This cannot be undone.`}
                      className="pill no"
                    >
                      Remove
                    </ConfirmDeleteButton>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
