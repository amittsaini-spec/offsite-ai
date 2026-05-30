"use client";

import { ReactNode } from "react";

type Props = {
  // A server action reference.
  action: (formData: FormData) => void | Promise<void>;
  id: string;
  confirmText: string;
  className?: string;
  children?: ReactNode;
};

// Inline form that posts the given id to a server action, gated by a
// browser confirm() so the agent doesn't nuke a hotel or venue by accident.
export default function ConfirmDeleteButton({
  action,
  id,
  confirmText,
  className,
  children,
}: Props) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(confirmText)) e.preventDefault();
      }}
      style={{ display: "inline" }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className={className ?? "btn-ghost"}>
        {children ?? "Delete"}
      </button>
    </form>
  );
}
