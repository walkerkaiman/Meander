import { useEffect } from "react";
import { Notifications } from "@mantine/notifications";
import { useShowStore } from "../store/useShowStore";
import { useConductorEngine } from "../runtime/useConductorEngine";
import { ServerMessage } from "@meander/conductor-types";

let wsSingleton: WebSocket | null = null;

/**
 * Access the underlying WebSocket instance. May be null if not yet connected.
 */
export function getConductorSocket() {
  return wsSingleton;
}

/**
 * React hook to establish and maintain the Conductor WebSocket connection.
 * Should be mounted once at the application root.
 */
export function useConductorSocket() {
  // Stores for downstream updates
  const setActive = useConductorEngine((s) => s.setActiveState);
  const setCountdown = useConductorEngine((s) => s.setCountdown);
  const completeVote = useConductorEngine((s) => s.completeVote);

  const pushErr = useShowStore((s) => s.pushError);

  useEffect(() => {
    // If an existing connection exists, reuse it
    if (wsSingleton && wsSingleton.readyState === WebSocket.OPEN) {
      return;
    }

    const url = `ws://${location.hostname}:4000`;
    const ws = new WebSocket(url);
    wsSingleton = ws;

    ws.onmessage = (evt) => {
      try {
        const msg: ServerMessage = JSON.parse(evt.data);
        switch (msg.type) {
          case "stateChanged":
            setActive(msg.payload);
            break;
          case "validationError":
            pushErr(msg.payload as unknown);
            Notifications.show({ color: "red", title: "Validation Error", message: "Show package invalid" });
            break;
          case "voteTick":
            setCountdown(msg.payload.remainingSeconds);
            break;
          case "voteResult":
            completeVote(msg.payload);
            break;
        }
      } catch (e) {
        console.warn("WS parse error", e);
      }
    };

    return () => {
      try {
        ws.close();
      } catch (_) {}
      if (wsSingleton === ws) wsSingleton = null;
    };
  }, [setActive, setCountdown, completeVote, pushErr]);
}
