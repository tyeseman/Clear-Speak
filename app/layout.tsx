import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { AuthGate } from "@/components/AuthGate";
import { PwaManager } from "@/components/PwaManager";
import { StyleInjector } from "@/components/StyleInjector";
import { criticalStyles } from "@/app/critical-styles";
import "./globals.css";

export const metadata: Metadata = {
  title: "KoloSpeak Coach",
  description: "Daily pronunciation, reading, and speaking clarity practice.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" }
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }]
  },
  appleWebApp: {
    capable: true,
    title: "KoloSpeak"
  }
};

export const viewport: Viewport = {
  themeColor: "#2f6f5e",
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <style dangerouslySetInnerHTML={{ __html: criticalStyles }} />
      </head>
      <body>
        <StyleInjector />
        <PwaManager />
        <AuthGate>{children}</AuthGate>
      </body>
    </html>
  );
}
