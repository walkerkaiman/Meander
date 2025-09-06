import React from 'react';
import { useShowStore } from '../store/useShowStore';
// Local file upload helper
import './MenuBar.css';

const MenuBar: React.FC = () => {
  const { setShow } = useShowStore();
  
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

        const res = await fetch(`http://${location.hostname}:4000/upload`, {
          method: 'POST',
          body: form,
        });

        if (!res.ok) {
          const msg = await res.text();
          alert(`Upload failed: ${msg}`);
          return;
        }

        // Fetch the graph the server just loaded
        const graphRes = await fetch(`http://${location.hostname}:4000/audience/graph`);
        if (graphRes.ok) {
          const graph = await graphRes.json();
          setShow(graph);
        } else {
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
      <div className="menu-actions">
        <button className="menu-btn" onClick={triggerFileInput}>
          Load Show
        </button>
      </div>
    </div>
  );
};

export default MenuBar;
