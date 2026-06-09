"use client";

import { useEffect, useState } from "react";

import { usePublicDebug } from "@/frontend_lib/hooks/use-public-debug";
import type { HealthApiResponse } from "@/frontend_lib/types/health";
import { fetchJson } from "@/frontend_lib/utils/fetch-json";

type ViewState = {
  loading: boolean;
  error: string | null;
  data: HealthApiResponse | null;
};

export function HealthPanel() {
  const publicDebug = usePublicDebug();
  const [state, setState] = useState<ViewState>({
    loading: true,
    error: null,
    data: null,
  });

  useEffect(() => {
    let mounted = true;

    fetchJson<HealthApiResponse>("/api/health")
      .then((data) => {
        if (!mounted) {
          return;
        }

        setState({ loading: false, error: null, data });
      })
      .catch((error: unknown) => {
        if (!mounted) {
          return;
        }

        setState({
          loading: false,
          error: error instanceof Error ? error.message : "Unknown error",
          data: null,
        });
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <section>
      <h2>Full-stack health check</h2>
      <p>NEXT_PUBLIC_DEBUG: {String(publicDebug)}</p>
      {state.loading && <p>Loading /api/health...</p>}
      {state.error && <p>Error: {state.error}</p>}
      {state.data && (
        <pre>
          {JSON.stringify(state.data, null, 2)}
        </pre>
      )}
    </section>
  );
}
