import { useEffect, useRef } from "react";
import { Notifications } from "@mantine/notifications";
import { useShowStore } from "../store/useShowStore";

export function useConductorSocket() {
  const setActive = useShowStore((s) => s.setActiveState);
  const pushErr = useShowStore((s) => s.pushError);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const url = `ws://${location.hostname}:4000`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        switch (msg.type) {
          case "stateChanged":
            setActive(msg.payload);
            break;
          case "validationError":
            pushErr(msg.payload);
            Notifications.show({ color: "red", title: "Validation Error", message: "Show package invalid" });
            break;
        }
      } catch (_) {}
    };

    return () => ws.close();
  }, [setActive, pushErr]);
}
