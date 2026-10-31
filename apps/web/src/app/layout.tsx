import type { Metadata, Viewport } from "next";
import { Anton, Manrope } from "next/font/google";
import { Providers } from "@/components/Providers";
import { THEME_COLOR_INK } from "@/lib/theme";
import "./globals.css";

const anton = Anton({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-anton",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "District VIII · Pool · PS5 · Food",
    template: "%s · District VIII",
  },
  description: "District VIII, Panoor: eight-ball pool, PS5 stations and food. Check live availability and book.",
  applicationName: "District VIII",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/LOGO.png",
    apple: "/LOGO.png",
  },
  appleWebApp: {
    capable: true,
    title: "District VIII",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: THEME_COLOR_INK,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${anton.variable} ${manrope.variable} antialiased`}>
      <body className="bg-ink font-sans text-white">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
