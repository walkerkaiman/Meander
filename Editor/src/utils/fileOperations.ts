import { ProjectData, State, Connection, Show, ShowMetadata, ValidationError, AudienceMedia } from '../types';


export class FileOperations {
  // Test method to see if static methods work at all
  static testMethod() {
    console.log('testMethod called successfully');
    return 'test';
  }

  static createNewShow(showName: string, author: string): ProjectData {
    const now = new Date().toISOString();
    const initialStateId = `scene_${Date.now()}`;
    
    const show: Show = {
      showName,
      version: '1.0',
      created: now,
      lastEdited: now,
      initialStateId,
      statesFile: 'config/states.json',
      outputsFile: 'config/outputs.json',
      metadataFile: 'config/metadata.json'
    };

    const metadata: ShowMetadata = {
      author,
      lastEditor: author,
      version: '1.0',
      notes: 'New show created'
    };

    const initialScene: State = {
      id: initialStateId,
      type: 'scene',
      title: 'Opening Scene',
      description: 'The adventure begins.',
      performerText: 'Enter stage and begin the story.',
      audienceMedia: [],
      outputIds: [],
      position: { x: 100, y: 100 },
      connections: []
    };

    return {
      show,
      states: [initialScene],
      outputs: [],
      connections: [],
      metadata
    };
  }

  static async loadShow(): Promise<ProjectData | null> {
    try {
      // First try to load the last saved project
      const lastProjectKey = localStorage.getItem('meander_last_project');
      if (lastProjectKey) {
        const savedProject = localStorage.getItem(lastProjectKey);
        if (savedProject) {
          const projectData = JSON.parse(savedProject);
          console.log('Loaded saved project:', projectData.show.showName);
          return projectData;
        }
      }

      // If no saved project exists, create a demo show
      console.log('No saved project found, creating demo show...');

      const demoProject = this.createNewShow('Demo Show', 'Demo Author');

      // Add some sample content
      const scene1 = {
        id: 'scene_1',
        type: 'scene' as const,
        title: 'The Beginning',
        description: 'Our story begins in a mysterious forest.',
        performerText: 'Enter stage left, looking around curiously.',
        audienceMedia: [],
        outputIds: [],
        position: { x: 100, y: 100 },
        connections: []
      };

      const fork1 = {
        id: 'fork_1',
        type: 'fork' as const,
        title: 'Choose Your Path',
        audienceText: 'Which path will you take?',
        performerText: 'Wait for audience decision.',
        countdownSeconds: 30,
        choices: [
          { label: 'Take the left path', nextStateId: 'scene_2' },
          { label: 'Take the right path', nextStateId: 'scene_3' }
        ],
        position: { x: 300, y: 100 },
        connections: [],
        audienceMedia: [],
        outputIds: []
      };

      const scene2 = {
        id: 'scene_2',
        type: 'scene' as const,
        title: 'Left Path Adventure',
        description: 'You chose the left path and discover ancient ruins.',
        performerText: 'Act out discovering ancient ruins.',
        audienceMedia: [],
        outputIds: [],
        position: { x: 500, y: 50 },
        connections: []
      };

      const scene3 = {
        id: 'scene_3',
        type: 'scene' as const,
        title: 'Right Path Adventure',
        description: 'You chose the right path and find a hidden village.',
        performerText: 'Act out discovering a hidden village.',
        audienceMedia: [],
        outputIds: [],
        position: { x: 500, y: 150 },
        connections: []
      };

      demoProject.states = [scene1, fork1, scene2, scene3];

      console.log('Demo show loaded successfully');
      return demoProject;
    } catch (error) {
      console.error('Error loading show:', error);
      return null;
    }
  }

  static async saveShow(projectData: ProjectData): Promise<void> {
    // Update timestamp
    projectData.show.lastEdited = new Date().toISOString();

    // Save to localStorage
    const projectKey = `meander_project_${projectData.show.showName.replace(/\s+/g, '_').toLowerCase()}`;
    try {
      localStorage.setItem(projectKey, JSON.stringify(projectData));
      localStorage.setItem('meander_last_project', projectKey);
      console.log('Show saved successfully:', projectData.show.showName);
    } catch (error) {
      console.error('Error saving to localStorage:', error);
      throw new Error('Failed to save project to local storage');
    }
  }

  // Utility function to safely handle media files
  static createMediaFileReference(file: File): Omit<AudienceMedia, 'originalFile' | 'checksum'> {
    return {
      type: file.type.startsWith('image/') ? 'image' : 'video',
      file: file.name,
      size: file.size
    };
  }

  // Utility function to validate file integrity
  static validateFileIntegrity(file: File): Promise<boolean> {
    return new Promise((resolve) => {
      if (!file || !(file instanceof File)) {
        resolve(false);
        return;
      }

      // Basic validation
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm'];
      const isValidType = validTypes.includes(file.type);
      const isValidSize = file.size > 0 && file.size < 100 * 1024 * 1024; // Max 100MB

      resolve(isValidType && isValidSize);
    });
  }

  static async exportShow(projectData: ProjectData): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const packageName = `${projectData.show.showName.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}`;

    try {
      // Always prioritize opening scene as initial state
      const openingScene = projectData.states.find(state => state.type === 'opening');
      let initialStateId: string;
      
      if (openingScene) {
        // Always use opening scene if it exists
        initialStateId = openingScene.id;
        if (projectData.show.initialStateId !== openingScene.id) {
          console.log(`🎬 Setting initial state to opening scene: ${initialStateId}`);
        }
      } else {
        // Fallback: use stored initialStateId if valid, otherwise first scene/node
        const initialStateExists = projectData.states.some(
          state => state.id === projectData.show.initialStateId
        );
        
        if (initialStateExists) {
          initialStateId = projectData.show.initialStateId;
          console.log(`⚠️ No opening scene found, using stored initial state: ${initialStateId}`);
        } else {
          console.warn(`⚠️ Invalid initialStateId detected: ${projectData.show.initialStateId}`);
          
          const firstScene = projectData.states.find(state => state.type === 'scene');
          if (firstScene) {
            initialStateId = firstScene.id;
            console.log(`✅ Using first scene: ${initialStateId}`);
          } else if (projectData.states.length > 0) {
            initialStateId = projectData.states[0].id;
            console.log(`✅ Using first available node: ${initialStateId}`);
          } else {
            throw new Error('Cannot export: No states exist in the project');
          }
        }
      }
      
      // Update projectData with the correct initialStateId
      projectData = {
        ...projectData,
        show: {
          ...projectData.show,
          initialStateId: initialStateId
        }
      };

      // Dynamically import JSZip
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      // Collect all media files
      const mediaFiles: { [key: string]: File } = {};
      const missingFiles: string[] = [];

      // Create show configuration with media assets
      const exportStates = projectData.states.map(state => ({
        ...state,
        audienceMedia: (state.audienceMedia || []).map(media => ({
          type: media.type,
          file: `assets/${media.file}`,
          size: media.size
        }))
      }));

      // Convert states array to nodes object (Conductor expects nodes as object, not states array)
      const exportNodes: Record<string, any> = {};
      exportStates.forEach(state => {
        // Fix connections array to contain target node IDs instead of connection IDs
        const targetNodeIds: string[] = [];
        
        // Find all connections from this node and extract their target node IDs
        const outgoingConnections = projectData.connections.filter(conn => conn.fromNodeId === state.id);
        outgoingConnections.forEach(conn => {
          targetNodeIds.push(conn.toNodeId);
        });

        // Create the node with target node IDs in connections array
        exportNodes[state.id] = {
          ...state,
          connections: targetNodeIds
        };
      });

      // Single comprehensive JSON export
      const exportData = {
        // Project metadata
        show: {
          showName: projectData.show.showName,
          version: '1.0',
          created: projectData.show.created,
          lastEdited: projectData.show.lastEdited,
          initialStateId: projectData.show.initialStateId
        },

        // Add metadata at top level for Conductor compatibility
        metadata: {
          ...projectData.metadata,
          initialStateId: projectData.show.initialStateId
        },

        // Use nodes object format (not states array) for Conductor compatibility
        nodes: exportNodes,
        connections: projectData.connections,
        outputs: projectData.outputs,

        // Export information
        exportedAt: new Date().toISOString(),
        version: '1.0',
        packageFormat: 'meander-show-v2',

        // Asset information
        assets: {
          folder: 'assets',
          totalFiles: 0,
          missingFiles: [] as string[]
        }
      };

      // Collect and add media files to assets folder
      let mediaCount = 0;
      for (const state of projectData.states) {
        const audienceMedia = state.audienceMedia || [];
        for (const media of audienceMedia) {
          if (media.originalFile && media.originalFile instanceof File) {
            const mediaPath = `assets/${media.file}`;
            if (!mediaFiles[mediaPath]) {
              mediaFiles[mediaPath] = media.originalFile;
              zip.file(mediaPath, media.originalFile);
              mediaCount++;
            }
          } else {
            // If originalFile is not available (e.g., from loaded project), warn user
            console.warn(`Media file "${media.file}" is missing. Please re-upload this file.`);
            // Add to a list of missing files to show to user
            missingFiles.push(media.file);
          }
        }
      }

      // Update asset information in export data
      exportData.assets.totalFiles = mediaCount;
      exportData.assets.missingFiles = missingFiles;

      // Add the single comprehensive JSON file
      zip.file('show.json', JSON.stringify(exportData, null, 2));

      // Generate and download the ZIP file
      const zipBlob = await zip.generateAsync({ type: 'blob' });

      const exportLink = document.createElement('a');
      exportLink.href = URL.createObjectURL(zipBlob);
      exportLink.download = `${packageName}.zip`;
      exportLink.click();

      // Clean up the object URL
      setTimeout(() => URL.revokeObjectURL(exportLink.href), 100);

      console.log(`🎭 Export successful: ${packageName}.zip`);
      console.log('📦 Package contents:');
      console.log('  📄 show.json (complete project data)');
      console.log('  📁 assets/');
      console.log(`    📄 ${mediaCount} media files included`);
      if (missingFiles.length > 0) {
        console.log(`    ⚠️  ${missingFiles.length} media files missing (not included)`);
        console.log('    Missing files:', missingFiles.join(', '));
      }
      console.log('');

      if (missingFiles.length > 0) {
        alert(`Export completed, but ${missingFiles.length} media files were missing and not included in the package:\n\n${missingFiles.join('\n')}\n\nPlease re-upload these files if you want them included in future exports.`);
        console.log('⚠️  Some media files were missing - please re-upload them for complete exports');
      } else {
        console.log('✅ Ready for Conductor import!');
      }

    } catch (error) {
      console.error('Error during export:', error);
      throw new Error('Failed to export project package');
    }
  }

  static validateProject(projectData: ProjectData): ValidationError[] {
    const errors: ValidationError[] = [];

    // Check show metadata
    if (!projectData.show.showName.trim()) {
      errors.push({
        type: 'missing_required',
        message: 'Show name is required',
        nodeId: 'show',
        severity: 'error'
      });
    }

    if (!projectData.metadata.author.trim()) {
      errors.push({
        type: 'missing_required',
        message: 'Author name is required',
        nodeId: 'metadata',
        severity: 'error'
      });
    }

    // Check each state/node
    projectData.states.forEach(state => {
      // Required fields for all states
      if (!state.title.trim()) {
        errors.push({
          type: 'missing_required',
          message: `State "${state.type}" is missing a title`,
          nodeId: state.id,
          severity: 'error'
        });
      }

      // Scene-specific validation
      if (state.type === 'scene') {
        if (!state.description.trim()) {
          errors.push({
            type: 'missing_required',
            message: `Scene "${state.title || 'Untitled'}" is missing a description`,
            nodeId: state.id,
            severity: 'error'
          });
        }

        // Check if scene connections exist and point to valid states
        const sceneConnections = projectData.connections.filter(conn => conn.fromNodeId === state.id);
        sceneConnections.forEach(connection => {
          const targetStateExists = projectData.states.some(s => s.id === connection.toNodeId);
          if (!targetStateExists) {
            errors.push({
              type: 'invalid_connection',
              message: `Scene "${state.title || 'Untitled'}" connection points to non-existent state: ${connection.toNodeId}`,
              nodeId: state.id,
              severity: 'error'
            });
          }
        });

        // Check for media files without original files (warnings)
        state.audienceMedia.forEach(media => {
          if (!media.originalFile) {
            errors.push({
              type: 'missing_asset',
              message: `Scene "${state.title || 'Untitled'}" has media file "${media.file}" but the original file was not found. Please re-upload this file.`,
              nodeId: state.id,
              severity: 'warning'
            });
          }
        });
      }

      // Opening scene-specific validation
      if (state.type === 'opening') {
        if (!state.description.trim()) {
          errors.push({
            type: 'missing_required',
            message: `Opening Scene "${state.title || 'Untitled'}" is missing a description`,
            nodeId: state.id,
            severity: 'error'
          });
        }

        // Check for invalid incoming connections to opening scene
        const incomingConnections = projectData.connections.filter(conn => conn.toNodeId === state.id);
        if (incomingConnections.length > 0) {
          errors.push({
            type: 'invalid_connection',
            message: `Opening Scene "${state.title || 'Untitled'}" should not have incoming connections`,
            nodeId: state.id,
            severity: 'error'
          });
        }

        // Check if opening scene connections exist and point to valid states
        const outgoingConnections = projectData.connections.filter(conn => conn.fromNodeId === state.id);
        outgoingConnections.forEach(connection => {
          const targetStateExists = projectData.states.some(s => s.id === connection.toNodeId);
          if (!targetStateExists) {
            errors.push({
              type: 'invalid_connection',
              message: `Opening Scene "${state.title || 'Untitled'}" connection points to non-existent state: ${connection.toNodeId}`,
              nodeId: state.id,
              severity: 'error'
            });
          }
        });

        // Check for media files without original files (warnings)
        state.audienceMedia.forEach(media => {
          if (!media.originalFile) {
            errors.push({
              type: 'missing_asset',
              message: `Opening Scene "${state.title || 'Untitled'}" has media file "${media.file}" but the original file was not found. Please re-upload this file.`,
              nodeId: state.id,
              severity: 'warning'
            });
          }
        });
      }

      // Ending scene-specific validation
      if (state.type === 'ending') {
        if (!state.description.trim()) {
          errors.push({
            type: 'missing_required',
            message: `Ending Scene "${state.title || 'Untitled'}" is missing a description`,
            nodeId: state.id,
            severity: 'error'
          });
        }

        // Check for invalid outgoing connections from ending scene
        const outgoingConnections = projectData.connections.filter(conn => conn.fromNodeId === state.id);
        if (outgoingConnections.length > 0) {
          errors.push({
            type: 'invalid_connection',
            message: `Ending Scene "${state.title || 'Untitled'}" should not have outgoing connections`,
            nodeId: state.id,
            severity: 'error'
          });
        }

        // Check if ending scene has at least one incoming connection
        const incomingConnections = projectData.connections.filter(conn => conn.toNodeId === state.id);
        if (incomingConnections.length === 0 && projectData.states.length > 1) {
          errors.push({
            type: 'missing_connection',
            message: `Ending Scene "${state.title || 'Untitled'}" should have at least one incoming connection`,
            nodeId: state.id,
            severity: 'error'
          });
        }

        // Check if incoming connections point to valid states
        incomingConnections.forEach(connection => {
          const sourceStateExists = projectData.states.some(s => s.id === connection.fromNodeId);
          if (!sourceStateExists) {
            errors.push({
              type: 'invalid_connection',
              message: `Ending Scene "${state.title || 'Untitled'}" has incoming connection from non-existent state: ${connection.fromNodeId}`,
              nodeId: state.id,
              severity: 'error'
            });
          }
        });

        // Check for media files without original files (warnings)
        state.audienceMedia.forEach(media => {
          if (!media.originalFile) {
            errors.push({
              type: 'missing_asset',
              message: `Ending Scene "${state.title || 'Untitled'}" has media file "${media.file}" but the original file was not found. Please re-upload this file.`,
              nodeId: state.id,
              severity: 'warning'
            });
          }
        });
      }

      // Fork-specific validation
      if (state.type === 'fork') {
        if (!state.audienceText.trim()) {
          errors.push({
            type: 'missing_required',
            message: `Fork "${state.title || 'Untitled'}" is missing audience text`,
            nodeId: state.id,
            severity: 'error'
          });
        }

        // Validate each choice present
        state.choices.forEach((choice, index) => {
          if (!choice.label.trim()) {
            errors.push({
              type: 'missing_required',
              message: `Fork "${state.title || 'Untitled'}" choice ${index + 1} is missing a label`,
              nodeId: state.id,
              severity: 'error'
            });
          }

          if (!choice.nextStateId) {
            errors.push({
              type: 'missing_connection',
              message: `Fork "${state.title || 'Untitled'}" choice "${choice.label || `Choice ${index + 1}`}" is missing a target state`,
              nodeId: state.id,
              severity: 'error'
            });
          } else {
            const nextStateExists = projectData.states.some(s => s.id === choice.nextStateId);
            if (!nextStateExists) {
              errors.push({
                type: 'invalid_connection',
                message: `Fork "${state.title || 'Untitled'}" choice "${choice.label || `Choice ${index + 1}`}" points to non-existent state: ${choice.nextStateId}`,
                nodeId: state.id,
                severity: 'error'
              });
            }
          }
        });
      }
    });

    // Check that non-terminal nodes have at least one output connection
    projectData.states.forEach(state => {
      // Skip validation for Ending scenes - they should NOT have output connections
      if (state.type === 'ending') {
        return;
      }

      const stateConnections = projectData.connections.filter(conn => conn.fromNodeId === state.id);

      // A node is terminal if it's not referenced by any other node's connections or choices
      // Opening scenes are always non-terminal (starting points)
      // Ending scenes are handled above (they're skipped)
      const isTerminal = !projectData.states.some(otherState => {
        if (otherState.type === 'scene' || otherState.type === 'opening') {
          // Scenes and OpeningScenes reference nodes through connections
          return projectData.connections.some(conn =>
            conn.fromNodeId === otherState.id && conn.toNodeId === state.id
          );
        } else if (otherState.type === 'fork') {
          // Forks reference nodes through their choices
          return otherState.choices.some(choice => choice.nextStateId === state.id);
        }
        return false;
      });

      // Only require connections for non-terminal nodes
      if (!isTerminal && stateConnections.length === 0) {
        errors.push({
          type: 'missing_connection',
          message: `Node "${state.title || `${state.type} ${state.id}`}" must have at least one output connection (it's not a terminal node)`,
          nodeId: state.id,
          severity: 'error'
        });
      }
    });

    return errors;
  }

  private static collectConnectedStates(states: State[], connections: Connection[], stateId: string, connected: Set<string>): void {
    if (connected.has(stateId)) return;

    connected.add(stateId);
    const state = states.find(s => s.id === stateId);
    if (!state) return;

    // Find all connections that start from this state
    const outgoingConnections = connections.filter(conn => conn.fromNodeId === stateId);
    outgoingConnections.forEach(connection => {
      this.collectConnectedStates(states, connections, connection.toNodeId, connected);
    });
  }

  static generateUniqueId(): string {
    return `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

}



