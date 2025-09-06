import React from 'react';

type MediaEntry = string | { file?: string; url?: string };

interface MediaPreviewProps {
  media: MediaEntry[];
}

// Simple file type detection helpers
const isImage = (path: string) => /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(path);
const isVideo = (path: string) => /\.(mp4|webm|ogg)$/i.test(path);

const MediaPreview: React.FC<MediaPreviewProps> = ({ media }) => {
  if (!media || media.length === 0) return null;

  return (
    <div className="media-preview">
      {media.map((entry, idx) => {
        const raw = typeof entry === 'string' ? entry : entry.url ?? entry.file ?? '';
        if (!raw) return null;
        const src = raw.startsWith('http')
          ? raw
          : raw.startsWith('/media/')
          ? `http://${location.hostname}:4000${raw}`
          : `http://${location.hostname}:4000/media/${raw.replace(/^.*[\\/]/, '')}`;
        if (isImage(src)) {
          return <img key={idx} src={src} alt="media" className="media-item" />;
        }
        if (isVideo(src)) {
          return (
            <video key={idx} src={src} controls className="media-item" />
          );
        }
        return null; // skip unrecognised media types
      })}
    </div>
  );
};

export default MediaPreview;
