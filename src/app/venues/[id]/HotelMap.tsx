"use client";

import { APIProvider, Map, AdvancedMarker } from "@vis.gl/react-google-maps";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

// Read-only map for the public venue detail page. The hotel's pin is
// non-draggable. Hides itself entirely if there's no API key or no
// coordinates so the surrounding section won't render an empty frame.
export default function HotelMap({
  lat,
  lng,
  label,
}: {
  lat: number;
  lng: number;
  label?: string;
}) {
  if (!API_KEY) return null;

  return (
    <APIProvider apiKey={API_KEY}>
      <Map
        mapId="venue-location"
        defaultCenter={{ lat, lng }}
        defaultZoom={15}
        gestureHandling="greedy"
        disableDefaultUI={false}
        style={{ width: "100%", height: 360 }}
      >
        <AdvancedMarker position={{ lat, lng }} title={label} />
      </Map>
    </APIProvider>
  );
}
