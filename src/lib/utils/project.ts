// utils/project.ts
export const projectY = (map: mapboxgl.Map, lon: number, lat: number): number =>
  map.project([lon, lat]).y;
export const projectX = (map: mapboxgl.Map, lon: number, lat: number): number =>
  map.project([lon, lat]).x;
