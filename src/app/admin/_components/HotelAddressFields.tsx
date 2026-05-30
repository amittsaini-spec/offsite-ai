"use client";

import { useEffect, useRef, useState } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  useMap,
  useMapsLibrary,
} from "@vis.gl/react-google-maps";

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

type Initial = {
  address?: string;
  city?: string;
  region?: string;
  country?: string;
  latitude?: number | null;
  longitude?: number | null;
};

// Hotel-zone Cancún fallback when no coords yet — keeps the map visible.
const DEFAULT_CENTER = { lat: 21.131, lng: -86.766 };

export default function HotelAddressFields({ initial }: { initial: Initial }) {
  const [address, setAddress] = useState(initial.address ?? "");
  const [city, setCity] = useState(initial.city ?? "");
  const [region, setRegion] = useState(initial.region ?? "");
  const [country, setCountry] = useState(initial.country ?? "");
  const [lat, setLat] = useState<number | null>(initial.latitude ?? null);
  const [lng, setLng] = useState<number | null>(initial.longitude ?? null);

  // No key → plain fields, no Google calls. Form still submits all values.
  if (!API_KEY) {
    return (
      <PlainFields
        address={address}
        city={city}
        region={region}
        country={country}
        lat={lat}
        lng={lng}
        setAddress={setAddress}
        setCity={setCity}
        setRegion={setRegion}
        setCountry={setCountry}
        setLat={setLat}
        setLng={setLng}
        missingKey
      />
    );
  }

  return (
    <APIProvider apiKey={API_KEY} libraries={["places"]}>
      <PlainFields
        address={address}
        city={city}
        region={region}
        country={country}
        lat={lat}
        lng={lng}
        setAddress={setAddress}
        setCity={setCity}
        setRegion={setRegion}
        setCountry={setCountry}
        setLat={setLat}
        setLng={setLng}
        autocompleteSlot={
          <PlaceAutocomplete
            value={address}
            onChange={setAddress}
            onPlace={(p) => {
              setAddress(p.address);
              if (p.city) setCity(p.city);
              if (p.region) setRegion(p.region);
              if (p.country) setCountry(p.country);
              if (p.lat != null) setLat(p.lat);
              if (p.lng != null) setLng(p.lng);
            }}
          />
        }
      />
      <div
        style={{
          marginTop: 14,
          borderRadius: 14,
          overflow: "hidden",
          border: "1px solid var(--line)",
          height: 280,
        }}
      >
        <Map
          mapId="hotel-pin"
          defaultCenter={lat != null && lng != null ? { lat, lng } : DEFAULT_CENTER}
          defaultZoom={lat != null && lng != null ? 15 : 11}
          gestureHandling="greedy"
          disableDefaultUI={false}
        >
          {lat != null && lng != null && (
            <DraggablePin
              position={{ lat, lng }}
              onMove={(p) => {
                setLat(p.lat);
                setLng(p.lng);
              }}
            />
          )}
        </Map>
        <MapRecenter lat={lat} lng={lng} />
      </div>
    </APIProvider>
  );
}

/* ---------- internal pieces ---------- */

function PlainFields(props: {
  address: string;
  city: string;
  region: string;
  country: string;
  lat: number | null;
  lng: number | null;
  setAddress: (s: string) => void;
  setCity: (s: string) => void;
  setRegion: (s: string) => void;
  setCountry: (s: string) => void;
  setLat: (n: number | null) => void;
  setLng: (n: number | null) => void;
  autocompleteSlot?: React.ReactNode;
  missingKey?: boolean;
}) {
  const {
    address,
    city,
    region,
    country,
    lat,
    lng,
    setAddress,
    setCity,
    setRegion,
    setCountry,
    setLat,
    setLng,
    autocompleteSlot,
    missingKey,
  } = props;

  return (
    <div>
      {missingKey && (
        <div
          style={{
            padding: "10px 14px",
            background: "#fdf2dc",
            color: "#7a5a14",
            borderRadius: 10,
            fontSize: 13,
            marginBottom: 14,
          }}
        >
          Address autocomplete is off — set <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code>
          {" "}in <code>.env</code> (and Vercel) to enable the search + map.
        </div>
      )}

      <div className="field">
        <label>Address</label>
        {autocompleteSlot ?? (
          <input
            className="input"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="123 Blvd Kukulcan, Hotel Zone, Cancún"
            required
          />
        )}
        {/* Hidden mirror so the form serializes the chosen string even when
            the autocomplete sets it imperatively. */}
        <input type="hidden" name="address" value={address} />
      </div>

      <div className="fgrid3">
        <div className="field">
          <label>City</label>
          <input
            className="input"
            name="city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label>Region / state</label>
          <input
            className="input"
            name="region"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
          />
        </div>
        <div className="field">
          <label>Country</label>
          <input
            className="input"
            name="country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
          />
        </div>
      </div>

      <div className="fgrid">
        <div className="field">
          <label>Latitude</label>
          <input
            className="input"
            name="latitude"
            type="number"
            step="any"
            value={lat ?? ""}
            onChange={(e) =>
              setLat(e.target.value === "" ? null : Number(e.target.value))
            }
            placeholder="21.131"
          />
        </div>
        <div className="field">
          <label>Longitude</label>
          <input
            className="input"
            name="longitude"
            type="number"
            step="any"
            value={lng ?? ""}
            onChange={(e) =>
              setLng(e.target.value === "" ? null : Number(e.target.value))
            }
            placeholder="-86.766"
          />
        </div>
      </div>
    </div>
  );
}

type ExtractedPlace = {
  address: string;
  city?: string;
  region?: string;
  country?: string;
  lat?: number;
  lng?: number;
};

function PlaceAutocomplete({
  value,
  onChange,
  onPlace,
}: {
  value: string;
  onChange: (s: string) => void;
  onPlace: (p: ExtractedPlace) => void;
}) {
  const places = useMapsLibrary("places");
  const inputRef = useRef<HTMLInputElement>(null);
  const acRef = useRef<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    if (!places || !inputRef.current || acRef.current) return;
    const ac = new places.Autocomplete(inputRef.current, {
      fields: ["address_components", "formatted_address", "geometry"],
    });
    acRef.current = ac;
    const listener = ac.addListener("place_changed", () => {
      const place = ac.getPlace();
      const extracted = extractPlace(place);
      onPlace(extracted);
    });
    return () => listener.remove();
  }, [places, onPlace]);

  return (
    <input
      ref={inputRef}
      className="input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Start typing a hotel or street address…"
      required
    />
  );
}

function extractPlace(place: google.maps.places.PlaceResult): ExtractedPlace {
  const comps = place.address_components ?? [];
  const get = (type: string) =>
    comps.find((c) => c.types.includes(type))?.long_name ?? "";
  const city =
    get("locality") || get("postal_town") || get("administrative_area_level_2");
  const region = get("administrative_area_level_1");
  const country = get("country");

  return {
    address: place.formatted_address ?? "",
    city,
    region,
    country,
    lat: place.geometry?.location?.lat(),
    lng: place.geometry?.location?.lng(),
  };
}

function DraggablePin({
  position,
  onMove,
}: {
  position: { lat: number; lng: number };
  onMove: (p: { lat: number; lng: number }) => void;
}) {
  return (
    <AdvancedMarker
      position={position}
      draggable
      onDragEnd={(e) => {
        const ll = e.latLng;
        if (!ll) return;
        onMove({ lat: ll.lat(), lng: ll.lng() });
      }}
    />
  );
}

// Recenter the map any time lat/lng change (after autocomplete pick).
function MapRecenter({ lat, lng }: { lat: number | null; lng: number | null }) {
  const map = useMap();
  useEffect(() => {
    if (!map || lat == null || lng == null) return;
    map.panTo({ lat, lng });
    map.setZoom(15);
  }, [map, lat, lng]);
  return null;
}
