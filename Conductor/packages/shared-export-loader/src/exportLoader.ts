import { ProjectData, ExportedProjectData, ValidationError } from './types';

export class ExportLoader {
  /**
   * Load a project from an exported ZIP file
   */
  static async loadExportedShow(file: File): Promise<ProjectData | null> {
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
      const projectData: ProjectData = {
        show: exportData.show,
        states: exportData.states.map((state: any) => ({
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
      const mediaFiles: { [key: string]: File } = {};
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
              mediaFiles[mediaPath] = mediaFileObj;

              // Update the media entry with the loaded file
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

  /**
   * Open a file picker dialog and load an exported show
   */
  static async loadShowFromFile(): Promise<ProjectData | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.zip';
      input.onchange = async (event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) {
          resolve(null);
          return;
        }

        try {
          const projectData = await this.loadExportedShow(file);
          resolve(projectData);
        } catch (error) {
          alert(`Error loading file: ${error instanceof Error ? error.message : 'Unknown error'}`);
          resolve(null);
        }
      };
      input.click();
    });
  }

  /**
   * Validate an exported project file without fully loading it
   */
  static async validateExportFile(file: File): Promise<{ isValid: boolean; errors: ValidationError[] }> {
    try {
      const JSZip = (await import('jszip')).default;
      const zip = await JSZip.loadAsync(file);

      const errors: ValidationError[] = [];

      // Check if show.json exists
      const showJsonFile = zip.file('show.json');
      if (!showJsonFile) {
        errors.push({
          type: 'file_corrupted',
          message: 'show.json not found in export file',
          severity: 'error'
        });
        return { isValid: false, errors };
      }

      // Read and validate show.json content
      const showJsonContent = await showJsonFile.async('text');
      const exportData = JSON.parse(showJsonContent);

      // Validate export format
      if (!exportData.packageFormat || exportData.packageFormat !== 'meander-show-v2') {
        errors.push({
          type: 'file_corrupted',
          message: 'Unsupported export format',
          severity: 'error'
        });
      }

      // Basic validation of required fields
      if (!exportData.show?.showName) {
        errors.push({
          type: 'missing_required',
          message: 'Show name is missing',
          severity: 'error'
        });
      }

      if (!exportData.states || !Array.isArray(exportData.states)) {
        errors.push({
          type: 'missing_required',
          message: 'States data is missing or invalid',
          severity: 'error'
        });
      }

      return { isValid: errors.length === 0, errors };
    } catch (error) {
      return {
        isValid: false,
        errors: [{
          type: 'file_corrupted',
          message: `Failed to read export file: ${error instanceof Error ? error.message : 'Unknown error'}`,
          severity: 'error'
        }]
      };
    }
  }
}
