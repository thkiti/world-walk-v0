"use client";

import { useCallback, useState } from "react";
import { HomeScreen } from "@/components/navigation/HomeScreen";
import { ActiveWalkView } from "@/components/walk/ActiveWalkView";
import { getDestinationById } from "@/lib/catalog";
import { exitFullscreenIfActive, requestFullscreen } from "@/lib/fullscreen";
import type { NavScreen } from "@/lib/types";

export function WorldWalkApp() {
  const [screen, setScreen] = useState<NavScreen>({ step: "home" });

  const goHome = useCallback(() => {
    exitFullscreenIfActive();
    setScreen({ step: "home" });
  }, []);

  if (screen.step === "home") {
    return (
      <HomeScreen
        onSelectPlace={(destinationId) => {
          requestFullscreen();
          setScreen({ step: "walking", destinationId });
        }}
      />
    );
  }

  if (screen.step === "walking") {
    const destination = getDestinationById(screen.destinationId);
    if (!destination) {
      goHome();
      return null;
    }

    return (
      <ActiveWalkView destination={destination} onExit={goHome} />
    );
  }

  return null;
}
