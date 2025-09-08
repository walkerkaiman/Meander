import { SceneNode } from '../types/conductor-types';
import { AudienceConfig, MediaItem } from '../types';
import { EventEmitter } from '../core/EventEmitter';

/**
 * Scene component for displaying fullscreen media
 */
export class Scene extends EventEmitter<{
  media_loaded: void;
  media_error: Error;
  transition_complete: void;
}> {
  private container: HTMLElement;
  private currentMediaElement: HTMLImageElement | HTMLVideoElement | null = null;
  private config: AudienceConfig;
  private isTransitioning = false;

  constructor(container: HTMLElement, config: AudienceConfig) {
    super();
    this.container = container;
    this.config = config;
  }

  /**
   * Render scene with media
   */
  render(node: SceneNode): void {

    // Clear container
    this.container.innerHTML = '';
    this.container.className = 'scene';

    // Get media items from node
    const mediaItems = this.getMediaItems(node);

    if (mediaItems.length > 0) {
      // Use first media item as per design document
      this.loadMedia(mediaItems[0]);
    } else {
      // Show fallback black background
      this.renderFallback();
    }
  }

  /**
   * Update scene with crossfade transition
   */
  updateWithTransition(node: SceneNode): void {
    if (this.isTransitioning) {
      return;
    }

    const mediaItems = this.getMediaItems(node);
    
    if (mediaItems.length > 0) {
      this.crossfadeToMedia(mediaItems[0]);
    } else {
      this.crossfadeToFallback();
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.currentMediaElement) {
      if (this.currentMediaElement instanceof HTMLVideoElement) {
        this.currentMediaElement.pause();
        this.currentMediaElement.src = '';
      }
      this.currentMediaElement.remove();
      this.currentMediaElement = null;
    }
    this.container.innerHTML = '';
    this.removeAllListeners();
  }

  private getMediaItems(node: SceneNode): MediaItem[] {

    // Type guard to check if node has audienceMedia property
    const nodeWithMedia = node as any;
    if (!nodeWithMedia.audienceMedia || !Array.isArray(nodeWithMedia.audienceMedia)) {
      return [];
    }


    return nodeWithMedia.audienceMedia.map((media: any): MediaItem => {
      // Handle both formats: string URLs from sequencer or objects from original data
      if (typeof media === 'string') {
        // Media is already a URL string from the sequencer (e.g., "/media/0.jpg")
        return {
          type: 'image', // Default to image for string URLs
          url: `http://${this.config.serverHost}:${this.config.serverPort}${media}`,
          alt: `${node.title} - media`
        };
      } else {
        // Media is an object with file property (original format)
        return {
          type: media.type || 'image',
          url: this.getMediaUrl(media.file),
          alt: `${node.title} - ${media.type}`
        };
      }
    });
  }

  private getMediaUrl(filePath: string): string {
    // Convert file path to server URL
    const baseUrl = `http://${this.config.serverHost}:${this.config.serverPort}`;
    
    // Remove "assets/" prefix if present and use /media/ route
    let cleanPath = filePath;
    if (cleanPath.startsWith('assets/')) {
      cleanPath = cleanPath.substring(7); // Remove "assets/" prefix
    }
    if (cleanPath.startsWith('/assets/')) {
      cleanPath = cleanPath.substring(8); // Remove "/assets/" prefix
    }
    
    // Use /media/ route as that's where Conductor server serves assets
    const mediaPath = `/media/${cleanPath}`;
    
    return `${baseUrl}${mediaPath}`;
  }

  private loadMedia(mediaItem: MediaItem): void {
    if (mediaItem.type === 'video') {
      this.createVideoElement(mediaItem);
    } else {
      this.createImageElement(mediaItem);
    }
  }

  private createImageElement(mediaItem: MediaItem): void {
    const img = document.createElement('img');
    img.className = 'scene__media';
    img.src = mediaItem.url;
    img.alt = mediaItem.alt || '';
    img.draggable = false;

    img.onload = () => {
      img.classList.add('scene__media--visible');
      this.emit('media_loaded');
    };

    img.onerror = () => {
      console.error('Failed to load image:', mediaItem.url);
      this.emit('media_error', new Error(`Failed to load image: ${mediaItem.url}`));
      this.renderFallback();
    };

    this.container.appendChild(img);
    this.currentMediaElement = img;
  }

  private createVideoElement(mediaItem: MediaItem): void {
    const video = document.createElement('video');
    video.className = 'scene__media';
    video.src = mediaItem.url;
    video.autoplay = true;
    video.loop = true;
    video.muted = true; // Required for autoplay in most browsers
    video.playsInline = true; // Better mobile experience
    video.controls = false;

    video.onloadeddata = () => {
      video.classList.add('scene__media--visible');
      this.emit('media_loaded');
    };

    video.onerror = () => {
      console.error('Failed to load video:', mediaItem.url);
      this.emit('media_error', new Error(`Failed to load video: ${mediaItem.url}`));
      this.renderFallback();
    };

    // Handle play promise for modern browsers
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch(error => {
        console.warn('Video autoplay failed:', error);
        // Video will still be visible, just not playing
      });
    }

    this.container.appendChild(video);
    this.currentMediaElement = video;
  }

  private renderFallback(): void {
    this.container.innerHTML = '';
    const fallback = document.createElement('div');
    fallback.className = 'scene__fallback';
    fallback.innerHTML = '<span class="sr-only">Scene background</span>';
    this.container.appendChild(fallback);
    this.currentMediaElement = null;
  }

  private crossfadeToMedia(mediaItem: MediaItem): void {
    this.isTransitioning = true;
    
    // Create new media element
    const tempContainer = document.createElement('div');
    tempContainer.className = 'scene';
    tempContainer.style.position = 'absolute';
    tempContainer.style.top = '0';
    tempContainer.style.left = '0';
    tempContainer.style.width = '100%';
    tempContainer.style.height = '100%';
    tempContainer.style.zIndex = '1';
    
    // Add to document temporarily
    document.body.appendChild(tempContainer);
    
    // Create scene instance for new media
    const tempScene = new Scene(tempContainer, this.config);
    
    tempScene.on('media_loaded', () => {
      this.performCrossfade(tempContainer);
    });
    
    tempScene.on('media_error', (error) => {
      document.body.removeChild(tempContainer);
      tempScene.destroy();
      this.isTransitioning = false;
      this.emit('media_error', error);
    });
    
    // Load new media
    tempScene.loadMedia(mediaItem);
  }

  private crossfadeToFallback(): void {
    if (this.currentMediaElement) {
      this.currentMediaElement.style.opacity = '0';
      
      setTimeout(() => {
        this.renderFallback();
        this.isTransitioning = false;
        this.emit('transition_complete');
      }, 500);
    } else {
      this.renderFallback();
      this.emit('transition_complete');
    }
  }

  private performCrossfade(newContainer: HTMLElement): void {
    // Fade out current content
    if (this.currentMediaElement) {
      this.currentMediaElement.style.opacity = '0';
    }

    setTimeout(() => {
      // Move new content to main container
      this.container.innerHTML = '';
      const newMedia = newContainer.querySelector('.scene__media') as HTMLImageElement | HTMLVideoElement;
      
      if (newMedia) {
        newMedia.style.opacity = '0';
        this.container.appendChild(newMedia);
        this.currentMediaElement = newMedia;
        
        // Fade in new content
        requestAnimationFrame(() => {
          newMedia.style.opacity = '1';
        });
      }

      // Clean up temporary container
      document.body.removeChild(newContainer);
      this.isTransitioning = false;
      this.emit('transition_complete');
    }, 500); // Match CSS transition duration
  }
}
