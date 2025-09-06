import React from "react";
import "./ControlBar.css";
import { useShowStore } from "../store/useShowStore";

const ControlBar: React.FC = () => {
  const activeState = useShowStore((s) => s.activeState);
  const canAdvance = useShowStore((s) => s.canAdvance);
  const advance = useShowStore((s) => s.advanceState);

  return (
    <div className="control-bar">
      <button
        className="control-btn control-btn-advance"
        onClick={advance}
        disabled={!canAdvance}
      >
        {activeState?.type === "fork" ? "Start Vote" : "Advance"}
      </button>
    </div>
  );
};

export default ControlBar;
