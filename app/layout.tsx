import { Geist, Instrument_Serif } from "next/font/google";
import type { Metadata } from "next";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Extract",
  description: "Paste a link. Get the words.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${geist.variable} ${serif.variable}`}>
      <body>{children}</body>
    </html>
  );
}