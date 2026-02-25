// my-app/frontend/app/components/MapClient.tsx
"use client";

import dynamic from "next/dynamic";

const Map = dynamic(() => import("./map"), {
  ssr: false,
  loading: () => <p>Loading Map...</p>,
});

export default function MapClient() {
  return <Map />;
}