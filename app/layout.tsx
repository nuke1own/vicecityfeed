import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import localFont from "next/font/local";
import { Suspense } from "react";
import { HydrationMarker } from "@/components/HydrationMarker";
import { PresenceTracker } from "@/components/PresenceTracker";
import { NavigationProgress } from "@/components/NavigationProgress";
import { ScrollToTop } from "@/components/ScrollToTop";
import { CRITICAL_CSS } from "@/lib/critical-css";
import { SITE } from "@/lib/site";
import { THEME_BOOT_SCRIPT, THEME_CSS } from "@/lib/themes";
import "./globals.css";

const body = localFont({
  src: "./fonts/inter.woff2",
  weight: "100 900",
  variable: "--font-body",
  display: "swap",
});

const display = localFont({
  src: "./fonts/outfit.woff2",
  weight: "100 900",
  variable: "--font-headline",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — ${SITE.tagline}`,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: [
    "GTA 6",
    "Grand Theft Auto VI",
    "Vice City",
    "Leonida",
    "Jason and Lucia",
    "GTA 6 map",
    "GTA 6 leaks",
    "Vice City Feed",
  ],
  authors: [{ name: SITE.name, url: SITE.url }],
  openGraph: {
    type: "website",
    locale: SITE.locale,
    url: SITE.url,
    siteName: SITE.name,
    title: SITE.name,
    description: SITE.description,
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: SITE.name,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: SITE.twitter,
    title: SITE.name,
    description: SITE.description,
    images: ["/opengraph-image"],
  },
  robots: {
    index: true,
    follow: true,
  },
  appleWebApp: {
    capable: true,
    title: SITE.name,
    statusBarStyle: "black-translucent",
  },
  // Stop iOS turning numbers and dates into phone or calendar links.
  formatDetection: { telephone: false, date: false, address: false, email: false },
  alternates: {
    canonical: SITE.url,
    types: {
      "application/rss+xml": `${SITE.url}/rss.xml`,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico?v=2", sizes: "any" },
      { url: "/icon.png?v=2", type: "image/png", sizes: "32x32" },
      { url: "/icon-512.png?v=2", type: "image/png", sizes: "512x512" },
    ],
    shortcut: "/favicon.ico?v=2",
    apple: [{ url: "/apple-touch-icon.png?v=2", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {

  return (
    // The boot script sets data-theme before hydration, so React must not warn.
    <html
      lang="en"
      className={`${body.variable} ${display.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
        <style
          id="vcf-critical"
          dangerouslySetInnerHTML={{ __html: CRITICAL_CSS }}
        />
        <style id="vcf-themes" dangerouslySetInnerHTML={{ __html: THEME_CSS }} />
      </head>
      <body className={`${body.className} min-h-full flex flex-col bg-ink text-paper`}>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-teal focus:px-3 focus:py-2 focus:text-ink"
        >
          Skip to content
        </a>
        <HydrationMarker />
        <PresenceTracker />
        <NavigationProgress />
        <Suspense fallback={null}>
          <ScrollToTop />
        </Suspense>
        <div className="flex-1 min-w-0">{children}</div>
      </body>
    </html>
  );
}
