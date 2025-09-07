import { ProjectData } from '../types';

// Standalone file loading functions to avoid static method issues
export async function loadExportedShow(file: File): Promise<ProjectData | null> {
  console.log('loadExportedShow called');
  try {
    // Dynamically import JSZip
    const JSZip = (await import('jszip')).default;
    const zip = await JSZip.loadAsync(file);

    // Check if show.json exists
    const showJsonFile = zip.file('show.json');
    if (!showJsonFile) {
      throw new Error('Invalid export file: show.json not found');
    }

    // Read the show.json content
    const showJsonContent = await showJsonFile.async('text');
    const exportData = JSON.parse(showJsonContent);

    // Validate the export format
    if (!exportData.packageFormat || exportData.packageFormat !== 'meander-show-v2') {
      throw new Error('Invalid export file: unsupported format');
    }

    // Convert exported data back to ProjectData format
    // Handle both old format (states array) and new format (nodes object)
    let states: any[];
    if (exportData.nodes) {
      // New format: convert nodes object to states array
      states = Object.values(exportData.nodes);
    } else if (exportData.states) {
      // Old format: use states array directly
      states = exportData.states;
    } else {
      throw new Error('Invalid export format: neither nodes nor states found');
    }

    const projectData: ProjectData = {
      show: exportData.show,
      states: states.map((state: any) => ({
        ...state,
        audienceMedia: (state.audienceMedia || []).map((media: any) => ({
          ...media,
          originalFile: undefined, // Media files will need to be re-uploaded
          checksum: undefined
        }))
      })),
      connections: exportData.connections || [],
      outputs: exportData.outputs || [],
      metadata: exportData.metadata
    };

    // Try to load media files from the ZIP
    const missingMedia: string[] = [];

    for (const state of projectData.states) {
      for (const media of state.audienceMedia) {
        const mediaPath = `assets/${media.file}`;
        const mediaFile = zip.file(mediaPath);

        if (mediaFile) {
          try {
            const mediaBlob = await mediaFile.async('blob');
            const mediaFileObj = new File([mediaBlob], media.file, {
              type: media.type === 'image' ? 'image/jpeg' : 'video/mp4'
            });
            media.originalFile = mediaFileObj;
          } catch (error) {
            console.warn(`Failed to load media file ${mediaPath}:`, error);
            missingMedia.push(media.file);
          }
        } else {
          missingMedia.push(media.file);
        }
      }
    }

    console.log(`🎭 Loaded exported project: ${projectData.show.showName}`);
    console.log(`📦 Export date: ${exportData.exportedAt}`);
    console.log(`📄 States: ${projectData.states.length}`);
    console.log(`🔗 Connections: ${projectData.connections.length}`);

    if (missingMedia.length > 0) {
      console.warn(`⚠️  ${missingMedia.length} media files could not be loaded:`, missingMedia);
      alert(`Project loaded successfully, but ${missingMedia.length} media files were missing from the export:\n\n${missingMedia.join('\n')}\n\nPlease re-upload these files if needed.`);
    } else {
      console.log('✅ All media files loaded successfully');
    }

    return projectData;
  } catch (error) {
    console.error('Error loading exported show:', error);
    throw new Error(`Failed to load exported show: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export function loadShowFromFile(): Promise<ProjectData | null> {
  console.log('loadShowFromFile called');
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.zip,.json';
    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) {
        resolve(null);
        return;
      }

      try {
        if (file.name.endsWith('.zip')) {
          const projectData = await loadExportedShow(file);
          resolve(projectData);
        } else {
          // Handle JSON files
          const reader = new FileReader();
          reader.onload = (e) => {
            try {
              const content = e.target?.result as string;
              const projectData = JSON.parse(content);
              resolve(projectData);
            } catch (error) {
              alert(`Failed to parse JSON file: ${error instanceof Error ? error.message : 'Unknown error'}`);
              resolve(null);
            }
          };
          reader.onerror = () => {
            alert('Failed to read the file. Please check if the file is accessible and try again.');
            resolve(null);
          };
          reader.readAsText(file);
        }
      } catch (error) {
        alert(`Error loading file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        resolve(null);
      }
    };
    input.click();
  });
}
