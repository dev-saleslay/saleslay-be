import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import Script from "next/script";
import { Providers } from "./providers";
import "./globals.css";

const bricolageGrotesque = localFont({
  src: [
    { path: "../public/fonts/BricolageGrotesque-ExtraLight.ttf", weight: "200", style: "normal" },
    { path: "../public/fonts/BricolageGrotesque-Light.ttf", weight: "300", style: "normal" },
    { path: "../public/fonts/BricolageGrotesque-Regular.ttf", weight: "400", style: "normal" },
    { path: "../public/fonts/BricolageGrotesque-Medium.ttf", weight: "500", style: "normal" },
    { path: "../public/fonts/BricolageGrotesque-SemiBold.ttf", weight: "600", style: "normal" },
    { path: "../public/fonts/BricolageGrotesque-Bold.ttf", weight: "700", style: "normal" },
    { path: "../public/fonts/BricolageGrotesque-ExtraBold.ttf", weight: "800", style: "normal" },
  ],
  variable: "--font-sans",
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SalesLay",
  description: "SalesLay dashboard for CRM integrations, lead management, and customer communication workflows.",
};

const themeInitScript = `
(() => {
  try {
    const stored = localStorage.getItem("saleslay-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const theme = stored === "light" || stored === "dark" || stored === "system" ? stored : "dark";
    const shouldUseDark = theme === "dark" || (theme === "system" && prefersDark);
    document.documentElement.classList.toggle("dark", shouldUseDark);
  } catch (_) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${bricolageGrotesque.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col">
        <Script id="theme-init" strategy="beforeInteractive">
          {themeInitScript}
        </Script>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
