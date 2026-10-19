import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import ServerSidebar from "./components/server-sidebar";
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
  title: "System Monitor",
  description: "Monitor your system's CPU",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const saved = localStorage.getItem("theme");
                const dark = saved === "dark" ||
                  (saved !== "light" && matchMedia("(prefers-color-scheme: dark)").matches);
                document.documentElement.classList.toggle("dark", dark);
              } catch {}
            `,
          }}
        />
      </head>
      <body className="min-h-full bg-neutral-50 text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50">
        <div className="flex min-h-screen">
          <Suspense fallback={<aside className="w-72 shrink-0 border-r border-neutral-200 dark:border-neutral-800" />}>
            <ServerSidebar />
          </Suspense>
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      </body>
    </html>
  );
}
