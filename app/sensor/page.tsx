import { Suspense } from "react";
import { SensorModePage } from "@/components/sensor/SensorModePage";

export default function SensorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-zinc-950 text-zinc-400">
          Loading sensor mode…
        </div>
      }
    >
      <SensorModePage />
    </Suspense>
  );
}
