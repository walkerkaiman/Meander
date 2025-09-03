import { ProjectData, State, Connection, Show, ShowMetadata, ValidationError } from '../types';

export class FileOperations {
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
        connections: [],
        nextStateId: 'fork_1'
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
        connections: []
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

  static async exportShow(projectData: ProjectData): Promise<void> {
    // Validate before exporting
    const validationErrors = this.validateProject(projectData);
    if (validationErrors.length > 0) {
      const errorMessages = validationErrors.map(err => err.message).join('\n');
      throw new Error(`Cannot export show due to validation errors:\n${errorMessages}`);
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const exportFolderName = `${projectData.show.showName}_${timestamp}`;

    try {
      // Create export directory structure in localStorage
      const exportData = {
        show: projectData.show,
        states: projectData.states,
        outputs: projectData.outputs,
        metadata: projectData.metadata,
        exportedAt: new Date().toISOString(),
        version: '1.0'
      };

      const exportKey = `meander_export_${exportFolderName}`;
      localStorage.setItem(exportKey, JSON.stringify(exportData));

      // Create a downloadable JSON file
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

      const exportLink = document.createElement('a');
      exportLink.setAttribute('href', dataUri);
      exportLink.setAttribute('download', `${exportFolderName}.json`);
      exportLink.click();

      console.log(`Export successful: ${exportFolderName}`);
      console.log('Created files:');
      console.log(`  ${exportFolderName}.json`);
      console.log('Export complete!');
    } catch (error) {
      console.error('Error during export:', error);
      throw new Error('Failed to export project');
    }
  }

  static validateProject(projectData: ProjectData): ValidationError[] {
    const errors: ValidationError[] = [];

    // Check show metadata
    if (!projectData.show.showName.trim()) {
      errors.push({
        type: 'missing_required',
        message: 'Show name is required',
        nodeId: 'show'
      });
    }

    if (!projectData.metadata.author.trim()) {
      errors.push({
        type: 'missing_required',
        message: 'Author name is required',
        nodeId: 'metadata'
      });
    }

    // Check each state/node
    projectData.states.forEach(state => {
      // Required fields for all states
      if (!state.title.trim()) {
        errors.push({
          type: 'missing_required',
          message: `State "${state.type}" is missing a title`,
          nodeId: state.id
        });
      }

      // Scene-specific validation
      if (state.type === 'scene') {
        if (!state.description.trim()) {
          errors.push({
            type: 'missing_required',
            message: `Scene "${state.title || 'Untitled'}" is missing a description`,
            nodeId: state.id
          });
        }

        // Performer text is optional for scenes - can be empty if not needed
        // if (!state.performerText.trim()) {
        //   errors.push({
        //     type: 'missing_required',
        //     message: `Scene "${state.title || 'Untitled'}" is missing performer text`,
        //     nodeId: state.id
        //   });
        // }

        // Check if scene connections exist and point to valid states
        const sceneConnections = projectData.connections.filter(conn => conn.fromNodeId === state.id);
        sceneConnections.forEach(connection => {
          const targetStateExists = projectData.states.some(s => s.id === connection.toNodeId);
          if (!targetStateExists) {
            errors.push({
              type: 'invalid_connection',
              message: `Scene "${state.title || 'Untitled'}" connection points to non-existent state: ${connection.toNodeId}`,
              nodeId: state.id
            });
          }
        });
        // } else {
        //   // Scene should have a next state (unless it's an ending)
        //   const isEnding = !projectData.states.some(otherState =>
        //     otherState.type === 'scene' && otherState.nextStateId === state.id ||
        //     otherState.type === 'fork' && otherState.choices.some(choice => choice.nextStateId === state.id)
        //   );
        //   if (!isEnding) {
        //     errors.push({
        //       type: 'missing_connection',
        //       message: `Scene "${state.title || 'Untitled'}" should have a next state connection`,
        //       nodeId: state.id
        //     });
        //   }
        // }
      }

      // Fork-specific validation
      if (state.type === 'fork') {
        if (!state.audienceText.trim()) {
          errors.push({
            type: 'missing_required',
            message: `Fork "${state.title || 'Untitled'}" is missing audience text`,
            nodeId: state.id
          });
        }

        // Performer text is optional for forks - can be empty if not needed
        // if (!state.performerText.trim()) {
        //   errors.push({
        //     type: 'missing_required',
        //     message: `Fork "${state.title || 'Untitled'}" is missing performer text`,
        //     nodeId: state.id
        //   });
        // }

        if (state.choices.length !== 2) {
          errors.push({
            type: 'invalid_fork',
            message: `Fork "${state.title || 'Untitled'}" must have exactly 2 choices, found ${state.choices.length}`,
            nodeId: state.id
          });
        } else {
          // Check both choices
          state.choices.forEach((choice, index) => {
            if (!choice.label.trim()) {
              errors.push({
                type: 'missing_required',
                message: `Fork "${state.title || 'Untitled'}" choice ${index + 1} is missing a label`,
                nodeId: state.id
              });
            }

            if (!choice.nextStateId) {
              errors.push({
                type: 'missing_connection',
                message: `Fork "${state.title || 'Untitled'}" choice "${choice.label || `Choice ${index + 1}`}" is missing a target state`,
                nodeId: state.id
              });
            } else {
              const nextStateExists = projectData.states.some(s => s.id === choice.nextStateId);
              if (!nextStateExists) {
                errors.push({
                  type: 'invalid_connection',
                  message: `Fork "${state.title || 'Untitled'}" choice "${choice.label || `Choice ${index + 1}`}" points to non-existent state: ${choice.nextStateId}`,
                  nodeId: state.id
                });
              }
            }
          });
        }
      }
    });

    // Check that each node has at least one output connection
    projectData.states.forEach(state => {
      const stateConnections = projectData.connections.filter(conn => conn.fromNodeId === state.id);
      if (stateConnections.length === 0) {
        errors.push({
          type: 'missing_connection',
          message: `Node "${state.title || `${state.type} ${state.id}`}" must have at least one output connection for export`,
          nodeId: state.id
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
