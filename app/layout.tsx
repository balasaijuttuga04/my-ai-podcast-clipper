import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Podcast Clipper",
  description: "Generate captioned vertical shorts from long podcast videos."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
