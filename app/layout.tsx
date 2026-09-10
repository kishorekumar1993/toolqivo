import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { AppClientLayout } from "@/components/layout/AppClientLayout";
import { JsonLd } from "@/components/seo/JsonLd";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://toolqivo.com"),
  title: "Toolqivo – Free Online Tools for PDF, Images, Finance & More",
  description:
    "Use fast and easy online tools for PDFs, images, finance, calculations, conversions and everyday tasks with Toolqivo.",
  keywords: [
    "online tools",
    "pdf tools",
    "image compressor",
    "image resizer",
    "emi calculator",
    "sip calculator",
    "age calculator",
    "free tools",
    "unit converter",
    "toolqivo",
  ],
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  authors: [{ name: "Toolqivo Team" }],
  creator: "Toolqivo",
  publisher: "Toolqivo",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: "Toolqivo – Free Online Tools for PDF, Images, Finance & More",
    description:
      "Use fast and easy online tools for PDFs, images, finance, calculations, conversions and everyday tasks with Toolqivo.",
    url: "https://toolqivo.com",
    siteName: "Toolqivo",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Toolqivo – Free Online Tools for PDF, Images, Finance & More",
    description:
      "Use fast and easy online tools for PDFs, images, finance, calculations, conversions and everyday tasks with Toolqivo.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "https://toolqivo.com",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#090E1A" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <JsonLd />
      </head>
      <body className="font-sans antialiased selection:bg-blue-500 selection:text-white">
        <AppClientLayout>{children}</AppClientLayout>
        <Script
          src="https://cdn.jsdelivr.net/npm/pdf-lib@1.17.9/dist/pdf-lib.min.js"
          strategy="lazyOnload"
        />
        <Script
          src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"
          strategy="lazyOnload"
        />
      </body>
    </html>
  );
}
