import React from "react";
import { Canvas as EditableCanvas } from "@meander/graph-components";
import { useShowStore } from "../store/useShowStore";

export default function Canvas() {
  const nodes = useShowStore((s) => s.nodes);
  const active = useShowStore((s) => s.activeState);

  // Read-only no-op callbacks
  const noop = () => {};

  return (
    <EditableCanvas
      states={nodes}
      connections={[]}
      selectedNodeId={active?.id ?? null}
      onNodeSelect={noop}
      onUpdateNode={noop}
      onCreateConnection={() => ""}
      onDeleteConnection={noop}
    />
  );
}
