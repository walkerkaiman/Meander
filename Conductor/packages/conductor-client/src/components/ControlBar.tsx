import React from "react";
import "./ControlBar.css";
import { useShowStore } from "../store/useShowStore";
import { useConductorEngine } from "../runtime/useConductorEngine";

const ControlBar: React.FC = () => {
  const activeState = useShowStore((s) => s.activeState);
  const canAdvance = useShowStore((s) => s.canAdvance);
  const engineAdvance = useConductorEngine((s)=>s.advance);
  const localAdvance = useShowStore((s)=>s.advanceState);
  const { showSeconds, sceneSeconds } = useConductorEngine();
  const fmt = (s:number)=> new Date(s*1000).toISOString().substr(11,8);

  return (
    <div className="control-bar">
      <div className="timers">
        <span style={{marginLeft:'1rem'}}>Scene {fmt(sceneSeconds)}</span>
      </div>
      <button
        className="control-btn control-btn-advance"
        onClick={() => {
          localAdvance(); // optimistic UI update
          engineAdvance();
        }}
        disabled={!canAdvance}
      >
        {activeState?.type === "fork" ? "Start Vote" : "Advance"}
      </button>
    </div>
  );
};

export default ControlBar;
