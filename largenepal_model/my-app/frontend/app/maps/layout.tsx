// my-app/frontend/app/maps/layout.tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wheelchair Navigation - Maps",
  description: "Accessible navigation maps for wheelchair users",
};

export default function MapsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
