"use client";

import { useState } from "react";
import { createTeamMemberAction } from "@/lib/actions";

// 16-char URL-safe password generated with crypto.getRandomValues so the
// admin doesn't pick weak defaults. The agent can change it on first login.
function generatePassword(len = 16): string {
  const alphabet =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const buf = new Uint32Array(len);
  crypto.getRandomValues(buf);
  let out = "";
  for (let i = 0; i < len; i++) out += alphabet[buf[i] % alphabet.length];
  return out;
}

export default function InviteForm() {
  const [password, setPassword] = useState("");
  const [revealed, setRevealed] = useState(false);

  return (
    <form action={createTeamMemberAction} className="formcard" style={{ marginBottom: 22 }}>
      <div className="fsec" style={{ marginTop: 0, paddingTop: 0, borderTop: "none" }}>
        Invite a team member
      </div>
      <div className="fgrid">
        <div className="field">
          <label>Name</label>
          <input className="input" name="name" required placeholder="Lisa Morales" />
        </div>
        <div className="field">
          <label>Email</label>
          <input
            className="input"
            name="email"
            type="email"
            required
            placeholder="lisa@destalabs.com"
          />
        </div>
      </div>
      <div className="fgrid">
        <div className="field">
          <label>Role</label>
          <select className="input" name="role" defaultValue="AGENT">
            <option value="AGENT">Agent</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>
        <div className="field">
          <label>Temporary password</label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              className="input"
              name="password"
              required
              minLength={8}
              type={revealed ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              style={{ flex: 1 }}
            />
            <button
              type="button"
              onClick={() => {
                setPassword(generatePassword());
                setRevealed(true);
              }}
              className="btn-ghost"
              style={{ fontSize: 13, padding: "8px 14px" }}
            >
              Generate
            </button>
            {password && (
              <button
                type="button"
                onClick={() => setRevealed((v) => !v)}
                className="btn-ghost"
                style={{ fontSize: 13, padding: "8px 14px" }}
              >
                {revealed ? "Hide" : "Show"}
              </button>
            )}
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
            You share this once over a secure channel; the agent can change it
            later from their profile.
          </div>
        </div>
      </div>
      <button
        className="submit"
        type="submit"
        style={{ maxWidth: 240, marginTop: 12 }}
      >
        Create team member →
      </button>
    </form>
  );
}
