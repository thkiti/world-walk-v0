"use client";

import { useSearchParams } from "next/navigation";
import { useSensorTransmitter } from "@/hooks/useSensorTransmitter";
import { getSensorPageUrl } from "@/lib/remote-sensor-url";
import { GLASS_PANEL } from "@/lib/ui";

function connectionLabel(
  status: ReturnType<typeof useSensorTransmitter>["connectionStatus"],
  displayConnected: boolean
): string {
  switch (status) {
    case "connecting":
      return "Connecting to relay…";
    case "connected":
      return displayConnected
        ? "Relay connected — tablet linked"
        : "Relay connected — waiting for tablet";
    case "disconnected":
      return "Relay disconnected — retrying…";
    case "error":
      return "Relay connection error";
    default:
      return "Not connected";
  }
}

export function SensorModePage() {
  const searchParams = useSearchParams();
  const initialSession = searchParams.get("session") || undefined;

  const sensor = useSensorTransmitter({
    initialSessionCode: initialSession,
  });

  const pageUrl =
    typeof window !== "undefined"
      ? getSensorPageUrl(sensor.sessionCode)
      : `/sensor?session=${sensor.sessionCode}`;

  return (
    <div className="flex min-h-dvh flex-col bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 px-4 py-5">
        <p className="text-xs font-semibold tracking-[0.25em] text-emerald-400 uppercase">
          World Walk Sensor
        </p>
        <h1 className="mt-1 text-2xl font-semibold">WORLD WALK SENSOR</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Phone in pocket counts steps and sends movement to your tablet.
        </p>
      </header>

      <main className="flex flex-1 flex-col gap-4 p-4">
        <section className={`p-4 ${GLASS_PANEL} !bg-zinc-900/80 !text-zinc-100`}>
          <p className="text-xs font-semibold tracking-wide text-emerald-300 uppercase">
            Session
          </p>
          <p className="mt-2 font-mono text-3xl font-bold tracking-widest text-white">
            {sensor.sessionCode}
          </p>
          <p className="mt-3 text-xs text-zinc-400">Enter this code on the tablet under Remote Phone Sensor.</p>
        </section>

        <section className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
          <label className="block text-xs text-zinc-300">
            Relay WebSocket URL
            <input
              type="text"
              value={sensor.relayBaseUrl}
              onChange={(event) => sensor.setRelayBaseUrl(event.target.value)}
              disabled={sensor.isActive}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-xs text-zinc-100"
            />
          </label>

          <div className="text-xs text-zinc-400">
            <p className="font-medium text-zinc-300">Sensor WebSocket URL</p>
            <p className="mt-1 break-all font-mono text-[11px] text-emerald-300/90">
              {sensor.websocketUrl}
            </p>
          </div>

          <div className="text-xs text-zinc-400">
            <p className="font-medium text-zinc-300">Sensor page URL</p>
            <p className="mt-1 break-all font-mono text-[11px]">{pageUrl}</p>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
            <p className="text-xs text-zinc-400">Steps</p>
            <p className="mt-1 text-3xl font-semibold tabular-nums">
              {sensor.steps}
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
            <p className="text-xs text-zinc-400">Distance sent</p>
            <p className="mt-1 text-3xl font-semibold tabular-nums">
              {(sensor.distanceSentMeters / 1000).toFixed(2)}
              <span className="ml-1 text-base font-normal text-zinc-400">km</span>
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 text-sm">
          <p
            className={
              sensor.connectionStatus === "connected"
                ? "text-emerald-400"
                : "text-zinc-400"
            }
          >
            {connectionLabel(
              sensor.connectionStatus,
              sensor.displayPeerConnected
            )}
          </p>
          {!sensor.isSupported || sensor.isUnavailable ? (
            <p className="mt-2 text-amber-300">
              Step sensor unavailable on this device. Use an Android phone with
              motion sensors.
            </p>
          ) : null}
        </section>
      </main>

      <footer className="sticky bottom-0 border-t border-zinc-800 bg-zinc-950/95 p-4 backdrop-blur">
        <div className="flex gap-3">
          {!sensor.isActive ? (
            <button
              type="button"
              className="min-h-14 flex-1 rounded-xl bg-emerald-500 text-base font-semibold text-zinc-950 active:scale-[0.98]"
              onClick={() => void sensor.start()}
              disabled={!sensor.isSupported || sensor.isUnavailable}
            >
              Start Sensor
            </button>
          ) : (
            <button
              type="button"
              className="min-h-14 flex-1 rounded-xl bg-zinc-800 text-base font-semibold text-white active:scale-[0.98]"
              onClick={sensor.stop}
            >
              Stop Sensor
            </button>
          )}
          <button
            type="button"
            className="min-h-14 rounded-xl px-4 text-sm font-medium text-zinc-400 hover:text-white"
            onClick={sensor.reset}
          >
            Reset
          </button>
        </div>
        <p className="mt-3 text-center text-[11px] text-zinc-500">
          Run <span className="font-mono">npm run relay</span> on your dev machine. Phone and tablet must share Wi-Fi.
        </p>
      </footer>
    </div>
  );
}
