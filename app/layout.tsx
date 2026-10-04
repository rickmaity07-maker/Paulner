import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Rye } from "next/font/google";
import { SITE_URL } from "@/lib/site-url";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const rye = Rye({
  variable: "--font-rye",
  subsets: ["latin", "latin-ext"],
  weight: "400",
});

const title = "Paulaner Meets Route 66 | Bar in Schweinfurt";
const description =
  "Paulaner vom Fass und Route-66-Flair, Am Zeughaus 8 in Schweinfurt. Fassbier ab 2,50 €, fränkische Weine und alkoholfreie Getränke. 4,5 Sterne auf Google.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title,
  description,
  openGraph: { title, description, type: "website", locale: "de_DE", alternateLocale: ["en_GB"], siteName: "Paulaner Meets Route 66" },
  twitter: { card: "summary_large_image", title, description },
};

export const viewport: Viewport = {
  themeColor: "#171415",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="de" className={`${geist.variable} ${geistMono.variable} ${rye.variable} antialiased`}>
      <body>{children}</body>
    </html>
  );
}
