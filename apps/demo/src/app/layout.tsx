import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fade & Shave Barbershop — Book Online | The Booking Kit Demo",
  description:
    "Demo barber shop booking site powered by The Booking Kit scheduling toolkit.",
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
