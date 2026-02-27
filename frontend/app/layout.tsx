import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ChessArena",
  description: "Online chess tournament platform for colleges",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
