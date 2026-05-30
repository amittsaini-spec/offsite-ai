import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Offsite.ai — Book the venue, not the room block",
  description:
    "An Airbnb for hotel venues. Search idle venue inventory across Cancún's best resorts.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
