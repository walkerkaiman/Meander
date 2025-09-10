import { ProjectData } from '../types';

// Temporary file storage for large media files
const tempFileStorage = new Map<string, File>();

// Standalone file loading functions to avoid static method issues
export async function loadExportedShow(file: File): Promise<ProjectData | null> {
  console.log('=== loadExportedShow called ===');
  console.log('File name:', file.name);
  console.log('File size:', (file.size / 1024 / 1024).toFixed(2), 'MB');

  try {
    // Dynamically import JSZip
    console.log('Loading JSZip...');
    const JSZip = (await import('jszip')).default;

    console.log('Loading ZIP file...');
    const zip = await JSZip.loadAsync(file);

    // List all files in the ZIP for debugging
    console.log('ZIP contents:');
    zip.forEach((relativePath, zipEntry) => {
      console.log(`  ${zipEntry.dir ? '[DIR]' : '[FILE]'} ${relativePath}`);
    });

    // Check if show.json exists
    console.log('Looking for show.json...');
    const showJsonFile = zip.file('show.json');
    if (!showJsonFile) {
      console.error('show.json not found in ZIP');
      throw new Error('Invalid export file: show.json not found');
    }

    // Read the show.json content
    console.log('Reading show.json...');
    const showJsonContent = await showJsonFile.async('text');
    console.log('show.json size:', showJsonContent.length, 'characters');

    const exportData = JSON.parse(showJsonContent);
    console.log('Parsed export data format:', exportData.packageFormat);

    // Validate the export format
    if (!exportData.packageFormat || exportData.packageFormat !== 'meander-show-v2') {
      console.error('Unsupported format:', exportData.packageFormat);
      throw new Error('Invalid export file: unsupported format');
    }

    // Convert exported data back to ProjectData format
    // Handle both old format (states array) and new format (nodes object)
    console.log('Converting project data...');
    let states: any[];
    if (exportData.nodes) {
      console.log('Using nodes format (new)');
      states = Object.values(exportData.nodes);
    } else if (exportData.states) {
      console.log('Using states format (old)');
      states = exportData.states;
    } else {
      console.error('Neither nodes nor states found in export data');
      throw new Error('Invalid export format: neither nodes nor states found');
    }

    console.log(`Found ${states.length} states/nodes`);

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
    console.log('Loading media files...');
    const missingMedia: string[] = [];
    const loadedMedia: string[] = [];
    let totalMediaSize = 0;

    for (const state of projectData.states) {
      for (const media of state.audienceMedia) {
        if (!media.file) {
          console.warn('Media entry missing file property:', media);
          missingMedia.push('unknown_file');
          continue;
        }

        // Try different possible paths for the media file
        const possiblePaths = [
          `assets/${media.file}`,
          media.file, // Direct path
          `media/${media.file}`, // Alternative media folder
          `${media.file}` // Just the filename
        ];

        let mediaFile = null;
        let foundPath = '';

        for (const path of possiblePaths) {
          console.log(`Looking for media file: ${path}`);
          mediaFile = zip.file(path);
          if (mediaFile) {
            foundPath = path;
            break;
          }
        }

        if (mediaFile) {
          try {
            console.log(`Loading media file: ${foundPath}`);
            const mediaBlob = await mediaFile.async('blob');
            const mediaFileObj = new File([mediaBlob], media.file, {
              type: media.type === 'image' ? 'image/jpeg' : 'video/mp4'
            });

            // Store in temporary storage for large files
            const tempKey = `temp_${Date.now()}_${media.file}`;
            tempFileStorage.set(tempKey, mediaFileObj);

            media.originalFile = mediaFileObj;
            loadedMedia.push(media.file);
            totalMediaSize += mediaBlob.size;

            console.log(`✅ Loaded ${media.file} (${(mediaBlob.size / 1024 / 1024).toFixed(2)} MB)`);
          } catch (error) {
            console.warn(`Failed to load media file ${foundPath}:`, error);
            missingMedia.push(media.file);
          }
        } else {
          console.warn(`Media file not found in ZIP: ${media.file}`);
          console.log('Tried paths:', possiblePaths);
          missingMedia.push(media.file);
        }
      }
    }

    console.log(`🎭 Loaded exported project: ${projectData.show.showName}`);
    console.log(`📦 Export date: ${exportData.exportedAt}`);
    console.log(`📄 States: ${projectData.states.length}`);
    console.log(`🔗 Connections: ${projectData.connections.length}`);
    console.log(`📁 Media files: ${loadedMedia.length} loaded, ${missingMedia.length} missing`);
    console.log(`💾 Total media size: ${(totalMediaSize / 1024 / 1024).toFixed(2)} MB`);

    if (missingMedia.length > 0) {
      console.warn(`⚠️  ${missingMedia.length} media files could not be loaded:`, missingMedia);
      const message = `Project loaded successfully, but ${missingMedia.length} media files were missing from the export:\n\n${missingMedia.join('\n')}\n\nPlease re-upload these files if needed.`;
      console.log('Missing files message:', message);
      alert(message);
    } else {
      console.log('✅ All media files loaded successfully');
    }

    return projectData;
  } catch (error) {
    console.error('Error loading exported show:', error);

    // Provide more detailed error information
    let errorMessage = 'Unknown error';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }

    const fullErrorMessage = `Failed to load exported show: ${errorMessage}\n\nPlease check:\n• The file is a valid ZIP archive\n• The ZIP contains a show.json file\n• The show.json follows the meander-show-v2 format`;

    console.error('Full error details:', fullErrorMessage);
    throw new Error(fullErrorMessage);
  }
}

export function loadShowFromFile(): Promise<ProjectData | null> {
  console.log('=== loadShowFromFile called ===');

  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.zip,.json';
    input.multiple = false; // Only allow one file at a time

    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) {
        console.log('No file selected');
        resolve(null);
        return;
      }

      console.log('Selected file:', {
        name: file.name,
        type: file.type,
        size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
        lastModified: new Date(file.lastModified).toISOString()
      });

      try {
        if (file.name.toLowerCase().endsWith('.zip')) {
          console.log('Processing as ZIP file...');
          const projectData = await loadExportedShow(file);
          console.log('ZIP processing complete');
          resolve(projectData);
        } else if (file.name.toLowerCase().endsWith('.json') || file.type === 'application/json') {
          console.log('Processing as JSON file...');

          // Handle JSON files
          const reader = new FileReader();
          reader.onload = (e) => {
            try {
              console.log('Reading JSON content...');
              const content = e.target?.result as string;
              console.log(`JSON file size: ${content.length} characters`);

              const projectData = JSON.parse(content);
              console.log('JSON parsed successfully');
              console.log('Project data:', {
                showName: projectData.show?.showName,
                statesCount: projectData.states?.length,
                connectionsCount: projectData.connections?.length
              });

              resolve(projectData);
            } catch (error) {
              const errorMsg = `Failed to parse JSON file: ${error instanceof Error ? error.message : 'Unknown error'}`;
              console.error('JSON parsing error:', error);
              alert(errorMsg);
              resolve(null);
            }
          };

          reader.onerror = () => {
            const errorMsg = 'Failed to read the JSON file. Please check if the file is accessible and try again.';
            console.error('FileReader error');
            alert(errorMsg);
            resolve(null);
          };

          reader.onabort = () => {
            console.log('File reading aborted');
            resolve(null);
          };

          console.log('Starting to read JSON file...');
          reader.readAsText(file);
        } else {
          const errorMsg = `Unsupported file type: ${file.type}\n\nPlease select a .zip export file or .json project file.`;
          console.error('Unsupported file type:', file.type);
          alert(errorMsg);
          resolve(null);
        }
      } catch (error) {
        const errorMsg = `Error loading file: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error('File loading error:', error);
        alert(errorMsg);
        resolve(null);
      }
    };

    // Handle if user cancels the file picker
    input.oncancel = () => {
      console.log('File selection cancelled by user');
      resolve(null);
    };

    console.log('Opening file picker...');
    input.click();
  });
}

// Utility function to clean up temporary files
export function cleanupTempFiles(): void {
  console.log(`Cleaning up ${tempFileStorage.size} temporary files`);
  tempFileStorage.clear();
}

// Utility function to get temporary file count
export function getTempFileCount(): number {
  return tempFileStorage.size;
}
