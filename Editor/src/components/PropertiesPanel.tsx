import React, { useState } from 'react';
import { State, Scene, Fork, StateUpdate } from '../types';
import { Play, GitBranch, Image, Video, Settings } from 'lucide-react';

interface PropertiesPanelProps {
  node: State | null;
  onUpdateNode: (nodeId: string, updates: StateUpdate) => void;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  node,
  onUpdateNode
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'media' | 'outputs'>('general');

  if (!node) {
    return (
      <div className="properties-panel">
        <div className="panel-header">
          <h3>Properties</h3>
        </div>
        <div className="panel-content">
          <div className="no-selection">
            <p>Select a node to edit its properties</p>
          </div>
        </div>
      </div>
    );
  }

  const handleUpdate = (updates: Partial<any>) => {
    onUpdateNode(node.id, updates);
  };

  const renderSceneProperties = (scene: Scene) => (
    <>
      <div className="property-group">
        <label>Title</label>
        <input
          type="text"
          value={scene.title}
          onChange={(e) => handleUpdate({ title: e.target.value })}
          placeholder="Scene title"
        />
      </div>

      <div className="property-group">
        <label>Description</label>
        <textarea
          value={scene.description}
          onChange={(e) => handleUpdate({ description: e.target.value })}
          placeholder="Scene description"
          rows={3}
        />
      </div>

      <div className="property-group">
        <label>Performer Text</label>
        <textarea
          value={scene.performerText}
          onChange={(e) => handleUpdate({ performerText: e.target.value })}
          placeholder="Cues for performers"
          rows={3}
        />
      </div>



      <div className="property-group">
        <label>Position</label>
        <div className="position-inputs">
          <input
            type="number"
            value={scene.position.x}
            onChange={(e) => handleUpdate({ 
              position: { ...scene.position, x: parseInt(e.target.value) || 0 }
            })}
            placeholder="X"
          />
          <input
            type="number"
            value={scene.position.y}
            onChange={(e) => handleUpdate({ 
              position: { ...scene.position, y: parseInt(e.target.value) || 0 }
            })}
            placeholder="Y"
          />
        </div>
      </div>
    </>
  );

  const renderForkProperties = (fork: Fork) => (
    <>
      <div className="property-group">
        <label>Title</label>
        <input
          type="text"
          value={fork.title}
          onChange={(e) => handleUpdate({ title: e.target.value })}
          placeholder="Choice title"
        />
      </div>

      <div className="property-group">
        <label>Audience Text</label>
        <textarea
          value={fork.audienceText}
          onChange={(e) => handleUpdate({ audienceText: e.target.value })}
          placeholder="Text shown to audience"
          rows={3}
        />
      </div>

      <div className="property-group">
        <label>Performer Text</label>
        <textarea
          value={fork.performerText}
          onChange={(e) => handleUpdate({ performerText: e.target.value })}
          placeholder="Cues for performers"
          rows={3}
        />
      </div>

      <div className="property-group">
        <label>Countdown Timer (seconds)</label>
        <input
          type="number"
          value={fork.countdownSeconds}
          onChange={(e) => handleUpdate({ countdownSeconds: parseInt(e.target.value) || 30 })}
          min="1"
          max="300"
        />
      </div>

      <div className="property-group">
        <label>Choices</label>
        {fork.choices.map((choice, index) => (
          <div key={index} className="choice-editor">
            <div className="choice-inputs">
              <input
                type="text"
                value={choice.label}
                onChange={(e) => {
                  const newChoices = [...fork.choices];
                  newChoices[index] = { ...choice, label: e.target.value };
                  handleUpdate({ choices: newChoices });
                }}
                placeholder={`Choice ${index + 1}`}
              />
              <div className="choice-info">
                Use output connection points to connect to next states
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="property-group">
        <label>Position</label>
        <div className="position-inputs">
          <input
            type="number"
            value={fork.position.x}
            onChange={(e) => handleUpdate({ 
              position: { ...fork.position, x: parseInt(e.target.value) || 0 }
            })}
            placeholder="X"
          />
          <input
            type="number"
            value={fork.position.y}
            onChange={(e) => handleUpdate({ 
              position: { ...fork.position, y: parseInt(e.target.value) || 0 }
            })}
            placeholder="Y"
          />
        </div>
      </div>
    </>
  );

  const renderMediaTab = () => {
    if (node.type !== 'scene') return null;
    
    return (
      <div className="media-tab">
        <div className="media-header">
          <h4>Audience Media</h4>
          <button className="btn btn-outline btn-sm">
            <Image size={16} />
            Add Image
          </button>
        </div>
        
        {node.audienceMedia.length === 0 ? (
          <div className="no-media">
            <p>No media files added yet</p>
          </div>
        ) : (
          <div className="media-list">
            {node.audienceMedia.map((media, index) => (
              <div key={index} className="media-item">
                <div className="media-icon">
                  {media.type === 'image' ? <Image size={16} /> : <Video size={16} />}
                </div>
                <div className="media-info">
                  <span className="media-name">{media.file}</span>
                  <span className="media-type">{media.type}</span>
                </div>
                <button 
                  className="remove-media"
                  onClick={() => {
                    const newMedia = node.audienceMedia.filter((_, i) => i !== index);
                    handleUpdate({ audienceMedia: newMedia });
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderOutputsTab = () => {
    if (node.type !== 'scene') return null;
    
    return (
      <div className="outputs-tab">
        <div className="outputs-header">
          <h4>Outputs</h4>
          <button className="btn btn-outline btn-sm">
            <Settings size={16} />
            Add Output
          </button>
        </div>
        
        {node.outputIds.length === 0 ? (
          <div className="no-outputs">
            <p>No outputs configured yet</p>
          </div>
        ) : (
          <div className="outputs-list">
            {node.outputIds.map((outputId, index) => (
              <div key={index} className="output-item">
                <span className="output-id">{outputId}</span>
                <button className="remove-output">×</button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="properties-panel">
      <div className="panel-header">
        <div className="node-type">
          {node.type === 'scene' ? <Play size={16} /> : <GitBranch size={16} />}
          <span>{node.type === 'scene' ? 'Scene' : 'Choice'}</span>
        </div>
        <h3>{node.title || 'Untitled'}</h3>
      </div>

      <div className="panel-tabs">
        <button
          className={`tab ${activeTab === 'general' ? 'active' : ''}`}
          onClick={() => setActiveTab('general')}
        >
          General
        </button>
        {node.type === 'scene' && (
          <>
            <button
              className={`tab ${activeTab === 'media' ? 'active' : ''}`}
              onClick={() => setActiveTab('media')}
            >
              Media
            </button>
            <button
              className={`tab ${activeTab === 'outputs' ? 'active' : ''}`}
              onClick={() => setActiveTab('outputs')}
            >
              Outputs
            </button>
          </>
        )}
      </div>

      <div className="panel-content">
        {activeTab === 'general' && (
          <div className="general-tab">
            {node.type === 'scene' ? renderSceneProperties(node) : renderForkProperties(node)}
          </div>
        )}
        
        {activeTab === 'media' && renderMediaTab()}
        {activeTab === 'outputs' && renderOutputsTab()}
      </div>
    </div>
  );
};
