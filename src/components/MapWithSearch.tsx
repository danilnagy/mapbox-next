"use client";

import {
  useState,
  useRef,
  useEffect,
  useMemo,
  FormEvent,
  KeyboardEvent,
  MouseEvent,
} from "react";
import Map, { Marker, NavigationControl, ViewState } from "react-map-gl/mapbox";
import type { MapRef } from "react-map-gl/mapbox";
import Emblem from "@/components/emblem";
import { projectX, projectY } from "@/lib/utils/project";
import { useMarkerCulling } from "@/hooks/use-marker-culling";
import { POI_CATEGORIES } from "./constants";

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN as string;
const DEBOUNCE_MS = 300;

/* ---------- Types ---------- */
interface GeocodeFeature {
  id: string;
  place_name: string;
  center: [number, number]; // [lon, lat]
}
interface GeocodeResponse {
  features: GeocodeFeature[];
}

/* POI feature (geometry + properties) */
interface PoiFeature {
  geometry: { coordinates: [number, number] }; // ← use geometry
  properties: {
    name: string;
    poi_category?: string[]; // e.g. ["education","school"]
    mapbox_id: string;
    metadata?: {
      website: string;
    };
  };
}

export default function MapWithSearch() {
  /* camera */
  const [viewState, setViewState] = useState<ViewState>({
    longitude: -74.006,
    latitude: 40.7128,
    zoom: 10,
    bearing: 0,
    pitch: 0,
    padding: {},
  });

  /* origin + POIs */
  const [marker, setMarker] = useState<{ lon: number; lat: number } | null>(
    null
  );
  const [pois, setPois] = useState<PoiFeature[]>([]); // ⬅︎ new

  /* search UI (unchanged) */
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<GeocodeFeature[]>([]);
  const [highlightIdx, setHighlightIdx] = useState<number>(-1);
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);

  const itemRefs = useRef<Array<HTMLLIElement | null>>([]);
  const listRef = useRef<HTMLUListElement | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null); // whole search box

  const mapRef = useRef<MapRef | null>(null);

  const [clickedPlaces, setClickedPlaces] = useState(new Set());
  const [showAllMarkers, setShowAllMarkers] = useState(false);

  const toggleShowAllMarkers = () => {
    setShowAllMarkers(!showAllMarkers);
  };

  /* close dropdown on outside click */
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | globalThis.MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* fetch suggestions (debounced) */
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length < 3) {
      setSuggestions([]);
      setHighlightIdx(-1);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      const url =
        `https://api.mapbox.com/geocoding/v5/mapbox.places/` +
        `${encodeURIComponent(query)}.json?autocomplete=true&limit=5` +
        `&access_token=${TOKEN}`;

      try {
        const json: GeocodeResponse = await fetch(url).then((r) => r.json());
        setSuggestions(json.features || []);
        setHighlightIdx(-1);
        setDropdownOpen(true); // show fresh results
      } catch {
        /* ignore network errors */
      }
    }, DEBOUNCE_MS);
  }, [query]);

  /* ── scroll highlighted row into view ───────────────────────── */
  useEffect(() => {
    if (highlightIdx < 0) return;
    const el = itemRefs.current[highlightIdx];
    el?.scrollIntoView({ block: "nearest" });
  }, [highlightIdx]);

  /* ---------- give keyboard focus to <ul> when it shows ---------- */
  useEffect(() => {
    if (dropdownOpen && suggestions.length > 0) {
      // timeout lets React finish painting first
      setTimeout(() => listRef.current?.focus(), 0);
    }
  }, [dropdownOpen, suggestions.length]);

  /* -------------- helper: fetch 10 nearby POIs -------------- */
  // async function fetchPOIs(lon: number, lat: number) {
  //   const categories = "park,school,hospital";
  //   const url =
  //     `https://api.mapbox.com/search/searchbox/v1/category/` +
  //     `${encodeURIComponent(categories)}` +
  //     `?proximity=${lon},${lat}` +
  //     `&limit=10` +
  //     `&access_token=${TOKEN}`;

  //   try {
  //     const data: { features: PoiFeature[] } = await fetch(url).then((r) =>
  //       r.json()
  //     );
  //     setPois(data.features ?? []);
  //   } catch {
  //     setPois([]); // network error → empty list
  //   }
  // }

  // function haversineDistanceMiles(
  //   lat1: number,
  //   lon1: number,
  //   lat2: number,
  //   lon2: number
  // ): number {
  //   const R = 3958.8; // Earth radius in miles
  //   const toRad = (deg: number) => (deg * Math.PI) / 180;
  //   const dLat = toRad(lat2 - lat1);
  //   const dLon = toRad(lon2 - lon1);

  //   const a =
  //     Math.sin(dLat / 2) ** 2 +
  //     Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  //   const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  //   return R * c;
  // }

  async function fetchPOIs(lon: number, lat: number, radius: number = 1) {
    // const categories = POI_CATEGORIES.join(",");
    // const radiusMeters = milesToMeters(radius); // Default is 1 mile
    // const bbox = getBoundingBox(lon, lat, radiusMeters * 1.25).join(",");
    const limit = 25;

    console.log(radius);

    const requests = POI_CATEGORIES.map((category) => {
      const url =
        `https://api.mapbox.com/search/searchbox/v1/category/` +
        `${encodeURIComponent(category)}` +
        `?proximity=${lon},${lat}` +
        `&limit=${limit}` +
        `&access_token=${TOKEN}`;

      return fetch(url)
        .then((r) => r.json())
        .then((data) => data.features ?? [])
        .catch(() => []); // Fail-safe: return empty array on error
    });

    const results = await Promise.all(requests);

    // Flatten the array of arrays
    const combined = results.flat();

    // Optional: Deduplicate by feature id
    // const uniqueId = Array.from(
    //   new Map(combined.map((f) => [f.properties.mapbox_id, f])).values()
    // );

    // // Optional: Deduplicate by feature id
    // const uniquePlace = Array.from(
    //   new Map(
    //     uniqueId.map((f) => [f.properties.name + f.properties.address, f])
    //   ).values()
    // );

    // // Filter to keep only those within the radius in miles
    // const filteredByDistance = uniquePlace.filter((f) => {
    //   const [poiLon, poiLat] = f.geometry.coordinates;
    //   const distance = haversineDistanceMiles(lat, lon, poiLat, poiLon);
    //   return distance <= radius;
    // });

    setPois(combined);

    return { places: combined };
  }

  /* -------------- goToPlace (add POI fetch) -------------- */
  function goToPlace(feature?: GeocodeFeature) {
    const target = feature ?? suggestions[0];
    if (!target) return;

    const [lon, lat] = target.center;
    setViewState((vs) => ({
      ...vs,
      longitude: lon,
      latitude: lat,
      pitch: 70,
      zoom: 16,
    }));
    setMarker({ lon, lat });

    fetchPOIs(lon, lat); // ⬅︎ get nearby POIs

    /* tidy UI */
    setQuery(target.place_name);
    setDropdownOpen(false);
    setHighlightIdx(-1);
    inputRef.current?.blur();
  }

  /* form submit */
  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (highlightIdx >= 0) {
      goToPlace(suggestions[highlightIdx]);
    } else {
      goToPlace();
    }
  }

  /* keyboard nav */
  function handleKeyDown(e: KeyboardEvent) {
    if (!suggestions.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIdx((i) => (i + 1) % suggestions.length);
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIdx((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    }
    if (e.key === "Enter") {
      e.preventDefault();
      goToPlace(suggestions[highlightIdx >= 0 ? highlightIdx : 0]);
    }
  }

  const sorted = useMemo(() => {
    const map = mapRef.current?.getMap();
    if (map === undefined) return [...pois];
    const sortedData = [...pois]
      .filter((p) => !clickedPlaces.has(p.properties.mapbox_id))
      // .filter((p) => visible.size === 0 || visible.has(p.id))
      .sort(
        (a, b) =>
          projectY(
            map,
            +a.geometry.coordinates[0],
            +a.geometry.coordinates[1]
          ) -
          projectY(map, +b.geometry.coordinates[0], +b.geometry.coordinates[1])
      )
      .filter(
        (p) =>
          projectX(
            map,
            +p.geometry.coordinates[0],
            +p.geometry.coordinates[1]
          ) > 0 &&
          projectX(
            map,
            +p.geometry.coordinates[0],
            +p.geometry.coordinates[1]
          ) < map._containerWidth &&
          projectY(
            map,
            +p.geometry.coordinates[0],
            +p.geometry.coordinates[1]
          ) > 0 &&
          projectY(
            map,
            +p.geometry.coordinates[0],
            +p.geometry.coordinates[1]
          ) < map._containerHeight
      );
    console.log(sortedData);
    return sortedData;
  }, [pois, mapRef.current?.getMap(), viewState, clickedPlaces]);

  const visible = useMarkerCulling(
    mapRef.current?.getMap(),
    showAllMarkers ? [] : sorted.toReversed(),
    100
  );

  const sortedIds = sorted.map((item) => item.properties.mapbox_id);

  /* ------------ render ------------ */
  return (
    <div className="h-screen w-screen relative">
      {/* ------------ Search bar + dropdown ------------ */}
      <form
        onSubmit={handleSubmit}
        className="
          absolute z-50 top-4 left-1/2 -translate-x-1/2
          w-[90vw]          /* fill 90 % of viewport width on mobile */
          max-w-xs          /* cap at ~20 rem (xs) */
          sm:max-w-md       /* bump to ~28 rem on ≥ 640 px screens */
        "
      >
        <div ref={wrapperRef} className="relative">
          <input
            ref={inputRef}
            value={query}
            onFocus={() => suggestions.length && setDropdownOpen(true)}
            onChange={(e) => {
              setQuery(e.target.value);
              setDropdownOpen(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search address…"
            className={`w-full px-3 py-2 outline-none shadow ${
              dropdownOpen ? "rounded-t-md" : "rounded-md"
            }`}
          />

          {/* suggestions list */}
          {dropdownOpen && suggestions.length > 0 && (
            <ul
              className="
                            absolute left-0 right-0 mt-0 rounded-b-md overflow-hidden shadow
                            max-h-60 overflow-y-auto nice-scrollbar
                            pb-2           /* ⬅︎ bottom inner space */
                            scroll-pb-2    /* ⬅︎ makes the space count when you scroll  */
                          "
            >
              {suggestions.map((feat, idx) => (
                <li
                  key={feat.id}
                  onMouseDown={() => goToPlace(feat)}
                  ref={(el) => {
                    itemRefs.current[idx] = el;
                  }}
                  className={`
                    px-3 py-2 cursor-pointer
                    hover:bg-blue-500/20 dark:hover:bg-blue-500/25
                    ${
                      idx === highlightIdx
                        ? "bg-blue-500/30 dark:bg-blue-500/40"
                        : ""
                    }
                  `}
                >
                  {feat.place_name}
                </li>
              ))}
            </ul>
          )}
        </div>
      </form>

      <div className="absolute z-50 top-4 left-4 flex flex-col gap-1">
        <button
          className="p-2 bg-black rounded cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            toggleShowAllMarkers();
          }}
        >
          {showAllMarkers ? "Hide overlapping" : "Show overlapping"}
        </button>
        {clickedPlaces.size > 0 && (
          <button
            className="p-2 bg-black rounded cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              setClickedPlaces(new Set());
            }}
          >
            Show all
          </button>
        )}
      </div>

      {/* ------------ Map ------------ */}
      <Map
        ref={(m) => (mapRef.current = m as any)}
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        mapboxAccessToken={TOKEN}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        style={{ width: "100%", height: "100%" }}
      >
        <NavigationControl position="bottom-right" />

        {/* POI pins (max 10) */}
        {sorted.map((p) => {
          const [plon, plat] = p.geometry.coordinates;
          const cats = p.properties.poi_category ?? [];
          const isSchool = cats.includes("school");
          const isGrocery = cats.includes("grocery");

          const isVisible =
            visible.size === 0 || visible.has(p.properties.mapbox_id);
          // const isVisible = true;
          const zIndex = sortedIds.indexOf(p.properties.mapbox_id); // “later in list” ▶ sits on top

          // const colour = isSchool
          //   ? "bg-green-600"
          //   : isGrocery
          //   ? "bg-red-500"
          //   : "bg-gray-500";

          // return (
          //   <Marker
          //     key={p.properties.mapbox_id}
          //     longitude={plon}
          //     latitude={plat}
          //     anchor="bottom"
          //     className="z-40" /* keep above basemap labels */
          //   >
          //     <div className="flex flex-col items-center -translate-y-1">
          //       {/* pin */}
          //       <span
          //         className={`h-5 w-5 rounded-full ${colour} ring-2 ring-white shadow-lg`}
          //       />
          //       {/* label */}
          //       <span
          //         className="
          //           mt-1 px-2 py-0.5 rounded text-xs font-semibold text-gray-900
          //           bg-white/90 backdrop-blur-sm whitespace-nowrap
          //           dark:bg-gray-800/90 dark:text-gray-100
          //         "
          //       >
          //         {p.properties.name}
          //       </span>

          //       <Emblem
          //         category={
          //           p.properties.poi_category
          //             ? p.properties.poi_category[0]
          //             : undefined
          //         }
          //         size="3"
          //         coverSrc={{ website: p.properties.metadata?.website }}
          //         name={p.properties.name}
          //         showLabel={true}
          //       />
          //     </div>
          //   </Marker>
          // );

          return (
            <Marker
              key={p.properties.mapbox_id}
              longitude={plon}
              latitude={plat}
              anchor="bottom"
              style={{
                zIndex: isVisible ? zIndex : 1,
                pointerEvents: isVisible ? "auto" : "none",
              }} //  ← magic line
            >
              <div
                className="group relative transition-opacity"
                style={{
                  opacity: isVisible ? 1 : 0.1,
                  pointerEvents: isVisible ? "auto" : "none",
                }}
              >
                <Emblem
                  category={
                    p.properties.poi_category
                      ? p.properties.poi_category[0]
                      : undefined
                  }
                  size="3"
                  coverSrc={{ website: p.properties.metadata?.website }}
                  name={p.properties.name}
                  showLabel={true}
                />
                {/* ───────────── Red X overlay ───────────── */}
                <div className="absolute left-0 right-0 top-[14px] flex w-full items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    className="flex size-8 min-w-8 items-center justify-center rounded bg-red-600 text-xs font-bold text-white shadow hover:bg-red-700 hover:shadow-xl cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      setClickedPlaces(
                        new Set([...clickedPlaces, p.properties.mapbox_id])
                      );
                      console.log(clickedPlaces);
                    }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={3}
                      stroke="currentColor"
                      className="size-6"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 18 18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </Marker>
          );
        })}

        {/* origin pin */}
        {marker && (
          <Marker longitude={marker.lon} latitude={marker.lat} anchor="bottom">
            <span className="relative block h-4 w-4">
              <span className="absolute inset-0 rounded-full bg-blue-600 animate-ping opacity-75" />
              <span className="absolute inset-0 rounded-full bg-blue-600" />
            </span>
          </Marker>
        )}
      </Map>
    </div>
  );
}
