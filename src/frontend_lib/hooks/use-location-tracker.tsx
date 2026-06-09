"use client";

import { useEffect, useRef } from "react";

import { fetchJsonWithAccessToken } from "@/frontend_lib/utils/auth-client";

export function useLocationTracker(enabled: boolean) {
  const watchId = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled || typeof navigator === "undefined" || !navigator.geolocation) {
      return;
    }

    function success(pos: GeolocationPosition) {
      const { latitude, longitude, accuracy } = pos.coords;

      void fetchJsonWithAccessToken("/api/attendance/location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latitude, longitude, accuracy }),
      }).catch(() => {
        // ignore network errors
      });
    }

    function error(_err: GeolocationPositionError) {
      // ignore
    }

    // ask for permission and start watching position
    navigator.permissions?.query?.({ name: "geolocation" as PermissionName }).then((perm) => {
      if (perm.state === "denied") return;

      watchId.current = navigator.geolocation.watchPosition(success, error, {
        enableHighAccuracy: true,
        maximumAge: 30_000,
        timeout: 10_000,
      }) as unknown as number;
    }).catch(() => {
      // fallback to direct watchPosition call
      watchId.current = navigator.geolocation.watchPosition(success, error, {
        enableHighAccuracy: true,
        maximumAge: 30_000,
        timeout: 10_000,
      }) as unknown as number;
    });

    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current as unknown as number);
      }
    };
  }, [enabled]);
}
