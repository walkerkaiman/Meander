import React from "react";
import "./ControlBar.css";
import { useShowStore } from "../store/useShowStore";
import { useConductorEngine } from "../runtime/useConductorEngine";

const ControlBar: React.FC = () => {
  const activeState = useShowStore((s) => s.activeState);
  const canAdvance = useShowStore((s) => s.canAdvance);
  const engineAdvance = useConductorEngine((s)=>s.advance);
  const engineStartVote = useConductorEngine((s)=>s.startVote);
  const localAdvance = useShowStore((s)=>s.advanceState);
  const { showSeconds, sceneSeconds, countdown, isVoting } = useConductorEngine();
  const fmt = (s:number)=> new Date(s*1000).toISOString().substr(11,8);

  const handleQRCodeClick = () => {
    // Open QR code page in new tab
    const qrUrl = `http://${location.hostname}:4000/QR`;
    window.open(qrUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="control-bar">
      <button
        className="control-btn control-btn-qr"
        onClick={handleQRCodeClick}
        title="Open QR Codes for Audience and Performer Pages"
      >
        📱 QR Codes
      </button>
      <button
        className={`control-btn control-btn-advance ${isVoting && countdown !== null ? 'countdown-active' : ''}`}
        onClick={() => {
          if (activeState?.type === "fork") {
            // For forks, just start the vote (don't do optimistic advance)
            console.log('🗳️ Starting vote for fork:', activeState.id);
            engineStartVote();
          } else {
            // For scenes, do optimistic advance + server advance
            console.log('🚀 Advancing from scene:', activeState?.id);
            localAdvance(); // optimistic UI update
            engineAdvance();
          }
        }}
        disabled={!canAdvance}
      >
        {isVoting && countdown !== null
          ? `${countdown}s`
          : activeState?.type === "fork"
            ? "Start Vote"
            : "Advance"}
      </button>
    </div>
  );
};

export default ControlBar;
