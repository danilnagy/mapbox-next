// hooks/use-marker-culling.ts
import { useEffect, useState, useRef } from "react";

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

export function useMarkerCulling(
  map: mapboxgl.Map | undefined,
  markers: PoiFeature[],
  size = 100 // marker size in px
) {
  const [visibleIds, setVisibleIds] = useState<Set<string>>(new Set());
  const prevVisible = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!map) return;

    const refresh = () => {
      const boxes: {
        id: string;
        left: number;
        right: number;
        top: number;
        bottom: number;
        // rank: number;
      }[] = [];

      // Step 1: project markers and create bounding boxes
      for (let i = 0; i < markers.length; i++) {
        const m = markers[i];
        const projected = map.project([
          m.geometry.coordinates[0],
          m.geometry.coordinates[1],
        ]);

        const x = projected.x;
        const y = projected.y;

        boxes.push({
          id: m.properties.mapbox_id,
          left: x - size / 2,
          right: x + size / 2,
          top: y - size * (2 / 3),
          bottom: y + size * (1 / 3),
          // rank: parseFloat(m.ranking),
        });
      }

      // Step 2: sort by ranking (descending) so highest priority is kept
      // boxes.sort((a, b) => {
      //   if (a.rank === b.rank) return 0; // leave as-is when ranks match
      //   return b.rank - a.rank; // otherwise sort descending by rank
      // });

      const result = new Set<string>();
      const placed: {
        left: number;
        right: number;
        top: number;
        bottom: number;
      }[] = [];

      // Step 3: loop through and cull overlapping boxes
      for (const box of boxes) {
        const collides = placed.some(
          (b) =>
            !(
              box.right < b.left ||
              box.left > b.right ||
              box.bottom < b.top ||
              box.top > b.bottom
            )
        );

        if (!collides) {
          result.add(box.id);
          placed.push(box);
        }
      }

      const sameSize = result.size === prevVisible.current.size;
      const sameMembers =
        sameSize && [...result].every((id) => prevVisible.current.has(id));

      if (!sameMembers) {
        prevVisible.current = result;
        setVisibleIds(result);
      }
    };

    refresh(); // 1st run
    map.on("render", refresh); // then every frame (smooth & flicker-free)
    return () => {
      map.off("render", refresh);
    };
  }, [map, markers, size]);

  return visibleIds;
}
