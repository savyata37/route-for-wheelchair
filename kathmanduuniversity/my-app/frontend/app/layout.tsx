// my-app/frontend/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "WheelNav - Accessible Navigation for Bhaktapur",
  description: "The first wheelchair-accessible navigation app for Nepal's historic streets. Real-time obstacle detection and accessibility-first routing.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}