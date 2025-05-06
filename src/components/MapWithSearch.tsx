"use client";

import {
  useState,
  useRef,
  useEffect,
  FormEvent,
  KeyboardEvent,
  MouseEvent,
} from "react";
import Map, { Marker, NavigationControl, ViewState } from "react-map-gl/mapbox";

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN as string;
const DEBOUNCE_MS = 300;

/* ---------- Types for geocoder response ---------- */
interface GeocodeFeature {
  id: string;
  place_name: string;
  center: [number, number]; // [lon, lat]
}
interface GeocodeResponse {
  features: GeocodeFeature[];
}

export default function MapWithSearch() {
  /* -------------- camera -------------- */
  const [viewState, setViewState] = useState<ViewState>({
    longitude: -74.006,
    latitude: 40.7128,
    zoom: 10,
    bearing: 0,
    pitch: 0,
    padding: {},
  });

  /* -------------- marker -------------- */
  const [marker, setMarker] = useState<{ lon: number; lat: number } | null>(
    null
  );

  /* -------------- search UI -------------- */
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<GeocodeFeature[]>([]);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const itemRefs = useRef<Array<HTMLLIElement | null>>([]);
  const listRef = useRef<HTMLUListElement | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null); // whole search box

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

  /* go to place (click or enter) */
  function goToPlace(feature?: GeocodeFeature) {
    const target = feature ?? suggestions[0];
    if (!target) return;

    const [lon, lat] = target.center;
    setViewState((vs) => ({ ...vs, longitude: lon, latitude: lat, zoom: 14 }));
    setMarker({ lon, lat });

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

      {/* ------------ Map ------------ */}
      <Map
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        mapboxAccessToken={TOKEN}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        style={{ width: "100%", height: "100%" }}
      >
        <NavigationControl position="bottom-right" />

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
