"use client";

import { APIProvider } from "@vis.gl/react-google-maps";
import { WorldWalkApp } from "@/components/WorldWalkApp";

export default function Home() {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return (
      <div className="flex h-dvh items-center justify-center p-6 text-center">
        <p>Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to .env.local</p>
      </div>
    );
  }

  return (
    <APIProvider apiKey={apiKey}>
      <WorldWalkApp />
    </APIProvider>
  );
}
