import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";

import AppProviders from "@/components/AppProviders";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Wakkelni Stars - AI Google Review Responder",
  description:
    "Let AI respond to hundreds of your Google Business Profile reviews in your unique brand voice. Boost SEO, build trust, and save time.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <head>
        <Script id="set-initial-language-direction" strategy="beforeInteractive">
          {`try {
            var stored = window.localStorage.getItem("app_language");
            var language = stored && stored.toLowerCase().indexOf("ar") === 0 ? "ar" : "en";
            document.documentElement.lang = language;
            document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
          } catch (e) {}`}
        </Script>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
