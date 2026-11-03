import type { Metadata } from "next";
import { Fraunces, Outfit } from "next/font/google";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "EcoTrack",
    template: "%s · EcoTrack",
  },
  description:
    "Photograph one waste item. EcoTrack names the material with a fine-tuned YOLOv8n model and applies a fixed bin rule.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${outfit.variable} ${fraunces.variable}`}>
      <body className="min-h-screen antialiased">
        <Header />
        <main id="content" className="mx-auto w-full max-w-6xl px-5 py-10">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
