import Link from "next/link";
import { loginAction } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const sp = await searchParams;
  return (
    <div className="auth">
      <div className="authcard">
        <Link href="/" className="logo">
          offsite<b>.ai</b>
        </Link>
        <h1>Team sign in</h1>
        <p>DestaLabs agent console — manage hotels &amp; venues.</p>

        {sp.error && <div className="err">Incorrect email or password.</div>}

        <form action={loginAction}>
          <input type="hidden" name="next" value={sp.next || "/admin"} />
          <div className="field">
            <label>Email</label>
            <input className="input" name="email" type="email" required autoFocus />
          </div>
          <div className="field">
            <label>Password</label>
            <input className="input" name="password" type="password" required />
          </div>
          <button className="submit" type="submit">
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
