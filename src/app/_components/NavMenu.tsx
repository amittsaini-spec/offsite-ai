"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

// Phone-only menu. Below 760px the nav links and team login fold into this
// panel so the bar never runs wider than the screen; on wider screens the
// button is hidden and SiteNav shows the links inline.
export default function NavMenu() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  // Esc closes the panel.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="nav-burger"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-controls="nav-panel"
        onClick={() => setOpen((o) => !o)}
      >
        <span />
        <span />
        <span />
      </button>
      {open && (
        <>
          <div className="nav-scrim" onClick={close} />
          <div id="nav-panel" className="nav-panel">
            <Link href="/venues" onClick={close}>
              Browse venues
            </Link>
            <Link href="/about" onClick={close}>
              About
            </Link>
            <Link href="/login" onClick={close}>
              Team login
            </Link>
            <div className="nav-panel-loc">⚲ Cancún · Riviera Maya</div>
          </div>
        </>
      )}
    </>
  );
}
