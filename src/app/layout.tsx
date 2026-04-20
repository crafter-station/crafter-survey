import type { Metadata, Viewport } from "next";
import { Geist_Mono, Space_Grotesk } from "next/font/google";

import { QueryProvider } from "@/components/query-provider";
import { ThemeSync } from "@/components/theme-sync";

import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Crafter Station Survey",
  description: "A private community survey for Crafter Station shippers.",
};

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { color: "#f5f4ef", media: "(prefers-color-scheme: light)" },
    { color: "#111111", media: "(prefers-color-scheme: dark)" },
  ],
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${spaceGrotesk.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background font-sans text-foreground">
        <QueryProvider>
          <ThemeSync />
          <svg
            aria-hidden="true"
            className="texture-noise"
            id="texture"
            preserveAspectRatio="none"
          >
            <filter id="noise">
              <feTurbulence
                type="fractalNoise"
                baseFrequency=".8"
                numOctaves="4"
                stitchTiles="stitch"
              />
              <feColorMatrix type="saturate" values="0" />
            </filter>
            <rect width="100%" height="100%" filter="url(#noise)" />
          </svg>
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
