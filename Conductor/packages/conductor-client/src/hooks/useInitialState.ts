import { useEffect } from "react";
import { useShowStore } from "../store/useShowStore";

export function useInitialState() {
  const setActive = useShowStore((s) => s.setActiveState);

  useEffect(() => {
    fetch(`http://${location.hostname}:4000/audience/show`)
      .then((res) => {
        if (!res.ok) throw new Error("No show");
        return res.json();
      })
      .then((state) => setActive(state))
      .catch(() => {});
  }, [setActive]);
}
