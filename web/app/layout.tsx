import type { Metadata, Viewport } from "next";
import { Sora, Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import SmoothScroll from "@/components/SmoothScroll";
import PageTransition from "@/components/PageTransition";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const SITE_URL = "https://aurisai.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Auris — Always listening. Quietly yours.",
    template: "%s — Auris",
  },
  description:
    "Auris is an always-on AI pendant. It listens, sees, and thinks — a software company that happens to make jewelry.",
  applicationName: "Auris",
  keywords: [
    "Auris",
    "AI pendant",
    "wearable AI",
    "ambient intelligence",
    "voice assistant",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    title: "Auris — Always listening. Quietly yours.",
    description:
      "An always-on AI pendant. It listens, sees, and thinks. A software company that happens to make jewelry.",
    url: SITE_URL,
    siteName: "Auris",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Auris — Always listening. Quietly yours.",
    description: "An always-on AI pendant. It listens, sees, and thinks.",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0b",
  colorScheme: "dark",
};

// Structured data so search engines understand the brand and the product.
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Auris",
  url: SITE_URL,
  description:
    "A software company that happens to make jewelry — makers of the always-on AI pendant.",
  makesOffer: {
    "@type": "Offer",
    itemOffered: {
      "@type": "Product",
      name: "Auris pendant",
      description:
        "An always-on AI pendant with a microphone, camera, and speaker.",
    },
    price: "199",
    priceCurrency: "USD",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${sora.variable} ${inter.variable}`}>
      <body className="bg-base text-fg font-body antialiased">
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <SmoothScroll>
          <Nav />
          <PageTransition>{children}</PageTransition>
          <Footer />
        </SmoothScroll>
        {/* Privacy-first analytics — no cookies, aligns with the product's promise.
            Selim: verify the domain in the Plausible dashboard before launch. */}
        <Script
          defer
          data-domain="aurisai.com"
          src="https://plausible.io/js/script.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
