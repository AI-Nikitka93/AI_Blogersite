import type { Metadata } from "next";
import { IBM_Plex_Mono, Manrope, Unbounded } from "next/font/google";
import type { ReactNode } from "react";

import "./globals.css";

const bodyFont = Manrope({
  subsets: ["latin", "cyrillic"],
  variable: "--font-body",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const displayFont = Unbounded({
  subsets: ["latin", "cyrillic"],
  variable: "--font-display",
  display: "swap",
  weight: ["400", "500", "600"],
});

const monoFont = IBM_Plex_Mono({
  subsets: ["latin", "cyrillic"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "500"],
});

function getSiteUrl(): URL {
  return new URL(
    process.env.MIRO_SITE_URL?.replace(/\/+$/, "") ??
      "https://ai-blogersite.vercel.app",
  );
}

const siteUrl = getSiteUrl();
const siteTitle = "Миро";
const siteDescription =
  "Короткие редакционные записи по свежим источникам: технологии, спорт, рынки и нейтральные мировые сюжеты без политической ленты.";

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: {
    default: siteTitle,
    template: `%s | ${siteTitle}`,
  },
  description: siteDescription,
  applicationName: siteTitle,
  alternates: {
    canonical: "/",
    types: {
      "application/rss+xml": "/feed.xml",
    },
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
  keywords: [
    "Миро",
    "редакционный блог",
    "технологии",
    "рынки",
    "спорт",
    "мировые события",
  ],
  openGraph: {
    type: "website",
    locale: "ru_RU",
    url: siteUrl,
    siteName: siteTitle,
    title: siteTitle,
    description: siteDescription,
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="ru">
      <body
        className={`${bodyFont.variable} ${displayFont.variable} ${monoFont.variable} font-[var(--font-body)] antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
