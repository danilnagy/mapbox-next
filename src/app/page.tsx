// app/page.tsx –‑ still a Server Component
import MapWithSearch from "@/components/MapWithSearch";

export default function Home() {
  return <MapWithSearch />; // <MapWithSearch> runs only on the client
}
