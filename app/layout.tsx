import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { AuthGate } from "@/components/AuthGate";
import { StyleInjector } from "@/components/StyleInjector";
import { criticalStyles } from "@/app/critical-styles";
import "./globals.css";

export const metadata: Metadata = {
  title: "ClearSpeak Coach",
  description: "Daily pronunciation, reading, and speaking clarity practice.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "ClearSpeak"
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
        <AuthGate>{children}</AuthGate>
      </body>
    </html>
  );
}
