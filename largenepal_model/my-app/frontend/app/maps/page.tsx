// my-app/frontend/app/maps/page.tsx
import MapClient from "../components/MapClient";

export default function Home() {
  return (
    <main style={{ width: "100vw", height: "100vh" }}>
      <MapClient />
    </main>
  );
}