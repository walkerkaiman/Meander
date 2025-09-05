import React from 'react';
import { useShowStore } from '../store/useShowStore';
import { ExportLoader } from 'shared-export-loader';
import './MenuBar.css';

const MenuBar: React.FC = () => {
  const { setShow } = useShowStore();
  
  const handleLoadShow = async () => {
    try {
      // Use the shared export loader
      const projectData = await ExportLoader.loadShowFromFile();
      if (projectData) {
        // Convert ProjectData format to the Conductor's expected format
        const conductorData = {
          states: projectData.states,
          connections: projectData.connections
        };
        setShow(conductorData);
        alert(`Show loaded successfully!\n\n📄 States: ${projectData.states.length}\n🔗 Connections: ${projectData.connections.length}\n\nShow: ${projectData.show.showName}`);
      } else {
        alert('Failed to load the show. The file may be corrupted or in an unsupported format.');
      }
    } catch (error) {
      alert(`Failed to load show: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
