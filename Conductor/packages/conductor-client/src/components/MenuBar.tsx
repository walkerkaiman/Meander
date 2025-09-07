import React from 'react';
import { useShowStore } from '../store/useShowStore';
import { useConductorEngine } from '../runtime/useConductorEngine';
// Local file upload helper
import './MenuBar.css';

const MenuBar: React.FC = () => {
  const { setShow } = useShowStore();
  const showSeconds = useConductorEngine((s)=>s.showSeconds);
  const fmt = (secs:number)=> new Date(secs*1000).toISOString().substr(11,8);
  const setTimers = useConductorEngine((s)=>s.setTimers);
  
  const handleLoadShow = async () => {
    // create a hidden file input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.zip';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const form = new FormData();
        form.append('show', file);

        console.log('🔄 Attempting to upload file:', file.name, 'Size:', file.size);
        console.log('🔗 Current location:', location.hostname, location.port, location.protocol);
        const uploadUrl = `http://localhost:4000/upload`;
        console.log('🔗 Upload URL:', uploadUrl);

        const res = await fetch(uploadUrl, {
          method: 'POST',
          body: form,
        });

        console.log('📡 Upload response status:', res.status, res.statusText);

        if (!res.ok) {
          const msg = await res.text();
          alert(`Upload failed: ${msg}`);
          return;
        }

        // Fetch the graph the server just loaded
        const graphRes = await fetch(`http://localhost:4000/audience/graph`);
        if (graphRes.ok) {
          const graph = await graphRes.json();
          console.log('📊 Graph received from server:', {
            statesCount: graph.states?.length || 0,
            connectionsCount: graph.connections?.length || 0,
            states: graph.states?.map((s: any) => ({ id: s.id, connections: s.connections })) || [],
            connections: graph.connections?.map((c: any) => `${c.fromNodeId} -> ${c.toNodeId}`) || []
          });
          setShow(graph);
          setTimers(0,0); // reset immediately; server ticks will follow
        } else {
          console.log('❌ Graph fetch failed:', graphRes.status, graphRes.statusText);
          alert('Show uploaded but graph not ready yet.');
        }
      } catch (err) {
        alert(`Upload error: ${err instanceof Error ? err.message : 'Unknown'}`);
      }
    };
    input.click();
  };


  const triggerFileInput = () => {
    handleLoadShow();
  };

  return (
    <div className="menu-bar">
      <div className="menu-logo">MEANDER Conductor</div>
      <div style={{color:'#a0a0a0', marginLeft:'1rem'}}>{fmt(showSeconds)}</div>
      <div className="menu-actions">
        <button className="menu-btn" onClick={triggerFileInput}>
          Load Show
        </button>
      </div>
    </div>
  );
};

export default MenuBar;
