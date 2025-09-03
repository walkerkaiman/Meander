import React, { useState } from 'react';
import { State, Scene, OpeningScene, EndingScene, Fork, StateUpdate, Connection } from '../types';
import { Play, GitBranch, Image, Video, Settings, Link, Unlink, Square } from 'lucide-react';

interface PropertiesPanelProps {
  node: State | null;
  connections: Connection[];
  states: State[];
  onUpdateNode: (nodeId: string, updates: StateUpdate) => void;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  node,
  connections,
  states,
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

  const renderOpeningSceneProperties = (opening: OpeningScene) => (
    <>
      <div className="property-group">
        <label>Title</label>
        <input
          type="text"
          value={opening.title}
          onChange={(e) => handleUpdate({ title: e.target.value })}
          placeholder="Opening scene title"
        />
      </div>

      <div className="property-group">
        <label>Description</label>
        <textarea
          value={opening.description}
          onChange={(e) => handleUpdate({ description: e.target.value })}
          placeholder="Opening scene description"
          rows={3}
        />
      </div>

      <div className="property-group">
        <label>Performer Text</label>
        <textarea
          value={opening.performerText}
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
            value={opening.position.x}
            onChange={(e) => handleUpdate({
              position: { ...opening.position, x: parseInt(e.target.value) || 0 }
            })}
            placeholder="X"
          />
          <input
            type="number"
            value={opening.position.y}
            onChange={(e) => handleUpdate({
              position: { ...opening.position, y: parseInt(e.target.value) || 0 }
            })}
            placeholder="Y"
          />
        </div>
      </div>
    </>
  );

  const renderEndingSceneProperties = (ending: EndingScene) => (
    <>
      <div className="property-group">
        <label>Title</label>
        <input
          type="text"
          value={ending.title}
          onChange={(e) => handleUpdate({ title: e.target.value })}
          placeholder="Ending scene title"
        />
      </div>

      <div className="property-group">
        <label>Description</label>
        <textarea
          value={ending.description}
          onChange={(e) => handleUpdate({ description: e.target.value })}
          placeholder="Ending scene description"
          rows={3}
        />
      </div>

      <div className="property-group">
        <label>Performer Text</label>
        <textarea
          value={ending.performerText}
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
            value={ending.position.x}
            onChange={(e) => handleUpdate({
              position: { ...ending.position, x: parseInt(e.target.value) || 0 }
            })}
            placeholder="X"
          />
          <input
            type="number"
            value={ending.position.y}
            onChange={(e) => handleUpdate({
              position: { ...ending.position, y: parseInt(e.target.value) || 0 }
            })}
            placeholder="Y"
          />
        </div>
      </div>
    </>
  );

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
        {fork.choices.map((choice, index) => {
          // Check if this choice has a connection
          const hasConnection = connections.some(conn =>
            conn.fromNodeId === fork.id &&
            conn.fromOutputIndex === index &&
            conn.toNodeId === choice.nextStateId
          );

          // Find the target state name
          const targetState = choice.nextStateId ? states.find(s => s.id === choice.nextStateId) : null;

          return (
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
                <div className="choice-connection-status">
                  {hasConnection ? (
                    <div className="connection-indicator connected">
                      <Link size={12} />
                      <span>Connected to: {targetState ? targetState.title || targetState.id : choice.nextStateId}</span>
                    </div>
                  ) : (
                    <div className="connection-indicator disconnected">
                      <Unlink size={12} />
                      <span>No connection - drag from output point {index} to connect</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
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

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (!isImage && !isVideo) {
      alert('Please select an image or video file.');
      return;
    }

    // Store the actual file for export
    const newMedia = [...node.audienceMedia, {
      type: isImage ? 'image' : 'video',
      file: file.name,
      originalFile: file,
      size: file.size
    }];
    handleUpdate({ audienceMedia: newMedia });

    // Reset the input
    event.target.value = '';
  };

  const renderMediaTab = () => {
    if (node.type !== 'scene' && node.type !== 'opening' && node.type !== 'ending') return null;

    // Only show media upload for scene types, not forks
    const canUploadMedia = node.type === 'scene' || node.type === 'opening' || node.type === 'ending';

    return (
      <div className="media-tab">
        <div className="media-header">
          <h4>Audience Media</h4>
          {canUploadMedia && (
            <div className="media-actions">
              <input
                type="file"
                id={`media-upload-${node.id}`}
                accept="image/*,video/*"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
              <label htmlFor={`media-upload-${node.id}`} className="btn btn-outline btn-sm">
                <Image size={16} />
                Add Media
              </label>
            </div>
          )}
        </div>

        {canUploadMedia && (
                  <div className="media-info">
          <p><strong>📦 All media files will be included in the export package</strong></p>
          <p>Upload images and videos to display on audience second screens</p>
        </div>
        )}

        {node.audienceMedia.length === 0 ? (
          <div className="no-media">
            <p>No media files added yet</p>
            <p>Upload images or videos to display on audience screens</p>
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
                  {media.size && (
                    <span className="media-size">
                      ({(media.size / 1024).toFixed(0)}KB)
                    </span>
                  )}
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
    if (node.type !== 'scene' && node.type !== 'opening' && node.type !== 'ending') return null;
    
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
          {node.type === 'scene' ? <Play size={16} /> :
           node.type === 'opening' ? <Square size={16} /> :
           node.type === 'ending' ? <Square size={16} /> :
           <GitBranch size={16} />}
          <span>
            {node.type === 'scene' ? 'Scene' :
             node.type === 'opening' ? 'Opening' :
             node.type === 'ending' ? 'Ending' :
             'Choice'}
          </span>
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
        {(node.type === 'scene' || node.type === 'opening' || node.type === 'ending') && (
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
            {node.type === 'scene' ? renderSceneProperties(node) :
             node.type === 'opening' ? renderOpeningSceneProperties(node) :
             node.type === 'ending' ? renderEndingSceneProperties(node) :
             renderForkProperties(node)}
          </div>
        )}
        
        {activeTab === 'media' && renderMediaTab()}
        {activeTab === 'outputs' && renderOutputsTab()}
      </div>
    </div>
  );
};
