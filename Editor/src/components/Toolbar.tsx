import React from 'react';
import { Save, Download, Plus, Play, GitBranch, FileText, FolderOpen } from 'lucide-react';

interface ToolbarProps {
  projectName: string;
  hasUnsavedChanges: boolean;
  onNewShow: () => void;
  onLoadShow: () => void;
  onSave: () => void;
  onExport: () => void;
  onAddScene: () => void;
  onAddFork: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  projectName,
  hasUnsavedChanges,
  onNewShow,
  onLoadShow,
  onSave,
  onExport,
  onAddScene,
  onAddFork
}) => {
  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <div className="project-info">
          <Play size={20} />
          <span className={`project-name ${hasUnsavedChanges ? 'unsaved' : ''}`}>
            {projectName}
          </span>
        </div>
        <div className="project-actions">
          <button 
            onClick={onNewShow}
            className="btn btn-outline btn-sm"
            title="New Show"
          >
            <FileText size={14} />
            New
          </button>
          <button 
            onClick={onLoadShow}
            className="btn btn-outline btn-sm"
            title="Load Show"
          >
            <FolderOpen size={14} />
            Load
          </button>
        </div>
      </div>
      
      <div className="toolbar-center">
        <div className="add-nodes">
          <button 
            onClick={onAddScene}
            className="btn btn-outline"
            title="Add Scene"
          >
            <Plus size={16} />
            Scene
          </button>
          
          <button 
            onClick={onAddFork}
            className="btn btn-outline"
            title="Add Choice"
          >
            <GitBranch size={16} />
            Choice
          </button>
        </div>
      </div>
      
      <div className="toolbar-right">
        <button
          onClick={onSave}
          className={`btn ${hasUnsavedChanges ? 'btn-secondary' : 'btn-primary'}`}
          title={hasUnsavedChanges ? "Save Show (Unsaved Changes)" : "Save Show"}
        >
          <Save size={16} />
          {hasUnsavedChanges ? 'Save*' : 'Save'}
        </button>

        <button
          onClick={onExport}
          className="btn btn-secondary"
          title="Export Show"
        >
          <Download size={16} />
          Export
        </button>
      </div>
    </div>
  );
};
