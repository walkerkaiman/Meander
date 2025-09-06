import { useEffect, useRef } from "react";
import { useConductorEngine } from "../runtime/useConductorEngine";

export function useInitialState() {
  const setActive = useConductorEngine((s) => s.setActiveState);
  const activeState = useConductorEngine((s) => s.activeState);
  const intervalRef = useRef<NodeJS.Timer | null>(null);

  useEffect(() => {
    // If we already have an active state, stop polling
    if (activeState) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Start polling once when no active state
    if (!intervalRef.current) {
      const poll = async () => {
        try {
          const res = await fetch(`http://${location.hostname}:4000/audience/show`);
          if (res.ok) {
            const state = await res.json();
            setActive(state);
          }
        } catch {
          // ignore network errors; will retry
        }
      };
      // immediate attempt then every 2s
      poll();
      intervalRef.current = setInterval(poll, 2000);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeState, setActive]);
}
