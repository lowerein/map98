import { Suspense } from "react";
import Map from "@/app/components/Map";

export default function Home() {
  return (
    <div className="w-full h-full">
      {/* Map reads useSearchParams (?mode=organize), so it needs a Suspense boundary. */}
      <Suspense fallback={<div className="w-full h-full bg-gray-100 dark:bg-gray-950" />}>
        <Map />
      </Suspense>
    </div>
  );
}
