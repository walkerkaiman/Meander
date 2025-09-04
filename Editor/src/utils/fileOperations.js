import { validateShow as sharedValidate } from "@meander/editor-validator";
export class FileOperations {
    static createNewShow(showName, author) {
        const now = new Date().toISOString();
        const initialStateId = `scene_${Date.now()}`;
        const show = {
            showName,
            version: '1.0',
            created: now,
            lastEdited: now,
            initialStateId,
            statesFile: 'config/states.json',
            outputsFile: 'config/outputs.json',
            metadataFile: 'config/metadata.json'
        };
        const metadata = {
            author,
            lastEditor: author,
            version: '1.0',
            notes: 'New show created'
        };
        const initialScene = {
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
    static async loadShow() {
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
                type: 'scene',
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
                type: 'fork',
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
                type: 'scene',
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
                type: 'scene',
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
        }
        catch (error) {
            console.error('Error loading show:', error);
            return null;
        }
    }
    static async saveShow(projectData) {
        // Update timestamp
        projectData.show.lastEdited = new Date().toISOString();
        // Save to localStorage
        const projectKey = `meander_project_${projectData.show.showName.replace(/\s+/g, '_').toLowerCase()}`;
        try {
            localStorage.setItem(projectKey, JSON.stringify(projectData));
            localStorage.setItem('meander_last_project', projectKey);
            console.log('Show saved successfully:', projectData.show.showName);
        }
        catch (error) {
            console.error('Error saving to localStorage:', error);
            throw new Error('Failed to save project to local storage');
        }
    }
    // Utility function to safely handle media files
    static createMediaFileReference(file) {
        return {
            type: file.type.startsWith('image/') ? 'image' : 'video',
            file: file.name,
            size: file.size
        };
    }
    // Utility function to validate file integrity
    static validateFileIntegrity(file) {
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
    static async exportShow(projectData) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const packageName = `${projectData.show.showName.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}`;
        try {
            // Dynamically import JSZip
            const JSZip = (await import('jszip')).default;
            const zip = new JSZip();
            // Collect all media files
            const mediaFiles = {};
            const missingFiles = [];
            // Create show configuration without File objects
            const exportStates = projectData.states.map(state => ({
                ...state,
                audienceMedia: (state.audienceMedia || []).map(media => ({
                    type: media.type,
                    file: `media/${media.file}`,
                    size: media.size
                }))
            }));
            const exportData = {
                show: {
                    ...projectData.show,
                    showName: projectData.show.showName,
                    version: '1.0',
                    created: projectData.show.created,
                    lastEdited: projectData.show.lastEdited,
                    initialStateId: projectData.show.initialStateId,
                    statesFile: 'config/states.json',
                    outputsFile: 'config/outputs.json',
                    metadataFile: 'config/metadata.json'
                },
                states: exportStates,
                outputs: projectData.outputs,
                metadata: projectData.metadata,
                exportedAt: new Date().toISOString(),
                version: '1.0',
                packageFormat: 'meander-show-v1'
            };
            // Add configuration files
            zip.file('config/states.json', JSON.stringify({ states: exportStates }, null, 2));
            zip.file('config/outputs.json', JSON.stringify({ outputs: projectData.outputs }, null, 2));
            zip.file('config/metadata.json', JSON.stringify(projectData.metadata, null, 2));
            zip.file('show.json', JSON.stringify(exportData, null, 2));
            // Collect and add media files
            let mediaCount = 0;
            for (const state of projectData.states) {
                const audienceMedia = state.audienceMedia || [];
                for (const media of audienceMedia) {
                    if (media.originalFile && media.originalFile instanceof File) {
                        const mediaPath = `media/${media.file}`;
                        if (!mediaFiles[mediaPath]) {
                            mediaFiles[mediaPath] = media.originalFile;
                            zip.file(mediaPath, media.originalFile);
                            mediaCount++;
                        }
                    }
                    else {
                        // If originalFile is not available (e.g., from loaded project), warn user
                        console.warn(`Media file "${media.file}" is missing. Please re-upload this file.`);
                        // Add to a list of missing files to show to user
                        missingFiles.push(media.file);
                    }
                }
            }
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
            console.log('  📁 config/');
            console.log('    📄 states.json');
            console.log('    📄 outputs.json');
            console.log('    📄 metadata.json');
            console.log('  📁 media/');
            console.log(`    📄 ${mediaCount} media files included`);
            if (missingFiles.length > 0) {
                console.log(`    ⚠️  ${missingFiles.length} media files missing (not included)`);
                console.log('    Missing files:', missingFiles.join(', '));
            }
            console.log('  📄 show.json (main configuration)');
            console.log('');
            if (missingFiles.length > 0) {
                alert(`Export completed, but ${missingFiles.length} media files were missing and not included in the package:\n\n${missingFiles.join('\n')}\n\nPlease re-upload these files if you want them included in future exports.`);
                console.log('⚠️  Some media files were missing - please re-upload them for complete exports');
            }
            else {
                console.log('✅ Ready for Conductor import!');
            }
        }
        catch (error) {
            console.error('Error during export:', error);
            throw new Error('Failed to export project package');
        }
    }
    static validateProject(projectData) {
        return sharedValidate(projectData);
    }
    static collectConnectedStates(states, connections, stateId, connected) {
        if (connected.has(stateId))
            return;
        connected.add(stateId);
        const state = states.find(s => s.id === stateId);
        if (!state)
            return;
        // Find all connections that start from this state
        const outgoingConnections = connections.filter(conn => conn.fromNodeId === stateId);
        outgoingConnections.forEach(connection => {
            this.collectConnectedStates(states, connections, connection.toNodeId, connected);
        });
    }
    static generateUniqueId() {
        return `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
//# sourceMappingURL=fileOperations.js.map