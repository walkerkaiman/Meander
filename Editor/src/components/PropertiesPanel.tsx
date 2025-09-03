import React, { useState } from 'react';
import { State, StateUpdate, Scene, OpeningScene, EndingScene, Fork, AudienceMedia } from '../types';
import { Play, GitBranch, Square, Image, Video } from 'lucide-react';

interface PropertiesPanelProps {
  node: State | null;
  onUpdateNode: (nodeId: string, updates: StateUpdate) => void;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  node,
  onUpdateNode
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'media'>('general');

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

  const handleUpdate = (updates: StateUpdate) => {
    if (!node) return;
    onUpdateNode(node.id, updates);
  };

  const renderSceneProperties = (scene: Scene) => (
    <div className="general-tab">
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
    </div>
  );

  const renderOpeningSceneProperties = (opening: OpeningScene) => (
    <div className="general-tab">
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
    </div>
  );

  const renderEndingSceneProperties = (ending: EndingScene) => (
    <div className="general-tab">
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
    </div>
  );

  const renderForkProperties = (fork: Fork) => (
    <div className="general-tab">
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
        <label>Countdown (seconds)</label>
        <input
          type="number"
          value={fork.countdownSeconds}
          onChange={(e) => handleUpdate({ countdownSeconds: parseInt(e.target.value) || 0 })}
          min="0"
          placeholder="Countdown time"
        />
      </div>

      <div className="property-group">
        <label>Choices</label>
        <div className="choices-list">
          {fork.choices.map((choice, index) => (
            <div key={index} className="choice-item">
              <input
                type="text"
                value={choice.label}
                onChange={(e) => {
                  const newChoices = [...fork.choices];
                  newChoices[index] = { ...newChoices[index], label: e.target.value };
                  handleUpdate({ choices: newChoices });
                }}
                placeholder={`Choice ${index + 1}`}
              />
              <button
                onClick={() => {
                  const newChoices = fork.choices.filter((_, i) => i !== index);
                  handleUpdate({ choices: newChoices });
                }}
              >
                ×
              </button>
            </div>
          ))}
          <button
            onClick={() => {
              const newChoices = [...fork.choices, { label: '', nextStateId: '' }];
              handleUpdate({ choices: newChoices });
            }}
          >
            Add Choice
          </button>
        </div>
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
    </div>
  );

  const renderMediaTab = () => {
    if (node.type !== 'scene' && node.type !== 'opening' && node.type !== 'ending') return null;

    return (
      <div className="media-tab">
        <div className="media-header">
          <h4>Audience Media</h4>
          <div className="media-actions">
            <input
              type="file"
              id={`media-upload-${node.id}`}
              accept="image/*,video/*"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;

                const isImage = file.type.startsWith('image/');
                const isVideo = file.type.startsWith('video/');

                if (!isImage && !isVideo) {
                  alert('Please select an image or video file.');
                  return;
                }

                const newMedia: AudienceMedia = {
                  type: isImage ? 'image' : 'video',
                  file: file.name,
                  originalFile: file,
                  size: file.size
                };

                handleUpdate({ audienceMedia: [...node.audienceMedia, newMedia] });
              }}
              style={{ display: 'none' }}
            />
            <label htmlFor={`media-upload-${node.id}`} className="btn btn-outline btn-sm">
              <Image size={16} />
              Add Media
            </label>
          </div>
        </div>

        <div className="media-list">
          {node.audienceMedia.map((media, index) => (
            <div key={index} className="media-item">
              <div className="media-info">
                {media.type === 'image' ? <Image size={16} /> : <Video size={16} />}
                <span className="media-name">{media.file}</span>
                <span className="media-size">({(media.size / 1024 / 1024).toFixed(1)} MB)</span>
              </div>
              <button
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
          <button
            className={`tab ${activeTab === 'media' ? 'active' : ''}`}
            onClick={() => setActiveTab('media')}
          >
            Media
          </button>
        )}
      </div>

      <div className="panel-content">
        {activeTab === 'general' && (
          node.type === 'scene' ? renderSceneProperties(node) :
          node.type === 'opening' ? renderOpeningSceneProperties(node) :
          node.type === 'ending' ? renderEndingSceneProperties(node) :
          renderForkProperties(node)
        )}

        {activeTab === 'media' && renderMediaTab()}
      </div>
    </div>
  );
};