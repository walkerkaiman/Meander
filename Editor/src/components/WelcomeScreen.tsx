import React, { useState } from 'react';
import { Plus, FolderOpen, Play } from 'lucide-react';

interface WelcomeScreenProps {
  onCreateNewShow: (showName: string, author: string) => void;
  onLoadShow: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onCreateNewShow,
  onLoadShow
}) => {
  const [showName, setShowName] = useState('');
  const [author, setAuthor] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateShow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showName.trim() || !author.trim()) return;
    
    setIsCreating(true);
    onCreateNewShow(showName.trim(), author.trim());
  };

  return (
    <div className="welcome-screen">
      <div className="welcome-content">
        <div className="welcome-header">
          <div className="logo">
            <Play size={48} />
            <h1>MEANDER</h1>
          </div>
          <p className="tagline">A Theatrical Choose-Your-Own-Adventure Platform</p>
        </div>

        <div className="welcome-actions">
          <div className="action-card">
            <h3>Create New Show</h3>
            <p>Start building a new interactive theatrical experience</p>
            
            <form onSubmit={handleCreateShow} className="create-form">
              <div className="form-group">
                <label htmlFor="showName">Show Name</label>
                <input
                  id="showName"
                  type="text"
                  value={showName}
                  onChange={(e) => setShowName(e.target.value)}
                  placeholder="Enter show name..."
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="author">Author</label>
                <input
                  id="author"
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Enter author name..."
                  required
                />
              </div>
              
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={isCreating || !showName.trim() || !author.trim()}
              >
                <Plus size={20} />
                {isCreating ? 'Creating...' : 'Create Show'}
              </button>
            </form>
          </div>

          <div className="action-card">
            <h3>Load Existing Show</h3>
            <p>Open a previously created show to continue editing</p>
            
            <button 
              onClick={onLoadShow}
              className="btn btn-secondary"
            >
              <FolderOpen size={20} />
              Load Show
            </button>
          </div>
        </div>

        <div className="welcome-info">
          <h4>What is MEANDER?</h4>
          <p>
            MEANDER is a platform for creating interactive theatrical experiences where 
            audience members vote to shape the story. Create branching narratives with 
            scenes, choices, and environmental outputs that respond to audience decisions.
          </p>
          
          <div className="features">
            <div className="feature">
              <strong>Scenes:</strong> Define story moments with performer cues and audience media
            </div>
            <div className="feature">
              <strong>Forks:</strong> Create binary choices that branch the narrative
            </div>
            <div className="feature">
              <strong>Outputs:</strong> Control lighting, audio, and video based on story state
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
