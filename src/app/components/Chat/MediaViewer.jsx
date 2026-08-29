'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import { X, Download, ChevronLeft, ChevronRight, FileText, FileSpreadsheet, File, ZoomIn, ZoomOut } from 'lucide-react';
import './styles/MediaViewer.scss';

const getMediaType = (item) => {
  if (item.type) return item.type;
  const name = item.name || item.filename || '';
  const ext = name.split('.').pop()?.toLowerCase();
  const src = item.src || '';

  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext)) return 'image';
  if (['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv'].includes(ext)) return 'video';
  if (['mp3', 'wav', 'aac', 'm4a', 'flac'].includes(ext)) return 'audio';
  if (ext === 'pdf') return 'pdf';
  if (['xls', 'xlsx', 'csv'].includes(ext)) return 'excel';
  if (['doc', 'docx'].includes(ext)) return 'word';
  if (src.startsWith('blob:') || src.match(/\.(jpg|jpeg|png|gif|webp)$/i)) return 'image';
  if (src.match(/\.(mp4|webm|ogg|mov)$/i)) return 'video';

  return 'document';
};

export default function MediaViewer({
  open = true,
  onClose,
  src,
  filename,
  type,
  mediaItems: propMediaItems,
  initialIndex = 0,
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [loading, setLoading] = useState(true);
  const [zoomed, setZoomed] = useState(false);
  const containerRef = useRef(null);

  // Normalize inputs: support both legacy single-item and new multi-item modes
  const items = propMediaItems && propMediaItems.length > 0
    ? propMediaItems
    : src
      ? [{ src, name: filename || 'Media', type: type || getMediaType({ src, name: filename }) }]
      : [];

  const currentItem = items[currentIndex] || items[0];
  const currentType = currentItem ? getMediaType(currentItem) : 'unknown';

  useEffect(() => {
    setCurrentIndex(initialIndex);
    setLoading(true);
  }, [initialIndex, open]);

  useEffect(() => {
    setLoading(true);
    setZoomed(false);
  }, [currentIndex]);

  const handleDownload = useCallback(() => {
    const item = items[currentIndex];
    if (!item?.src) return;
    const link = document.createElement('a');
    link.href = item.src;
    link.download = item.name || item.filename || `media-${currentIndex}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [items, currentIndex]);

  const goNext = useCallback(() => {
    if (items.length > 1) {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }
  }, [items.length]);

  const goPrev = useCallback(() => {
    if (items.length > 1) {
      setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
    }
  }, [items.length]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, goNext, goPrev, onClose]);

  if (!open || items.length === 0) return null;

  const renderContent = () => {
    const item = currentItem;
    if (!item) return null;

    switch (currentType) {
      case 'image':
        return (
          <img
            src={item.src}
            alt={item.name || 'preview'}
            className={`media-viewer-media ${zoomed ? 'zoomed' : ''}`}
            style={{ opacity: loading ? 0 : 1, transition: 'opacity 0.3s' }}
            onClick={() => setZoomed((z) => !z)}
            onLoad={() => setLoading(false)}
            onError={() => setLoading(false)}
          />
        );
      case 'video':
        return (
          <video
            src={item.src}
            controls
            autoPlay
            className="media-viewer-media"
            onLoadedData={() => setLoading(false)}
            onError={() => setLoading(false)}
          />
        );
      case 'audio':
        return (
          <Box sx={{ color: 'var(--button-color)', textAlign: 'center', p: 4 }}>
            <FileText size={64} />
            <Typography variant="h6" sx={{ mt: 2 }}>{item.name || 'Audio'}</Typography>
            <audio src={item.src} controls style={{ marginTop: 16, width: '100%', maxWidth: 400 }} />
          </Box>
        );
      case 'pdf':
        return (
          <iframe
            src={item.src}
            title={item.name || 'PDF'}
            style={{ width: '90vw', height: '85vh', border: 'none', borderRadius: 8, background: 'var(--bg-paper)' }}
            onLoad={() => setLoading(false)}
            onError={() => setLoading(false)}
          />
        );
      case 'excel': {
        const viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(item.src)}`;
        return (
          <iframe
            src={viewerUrl}
            title={item.name || 'Excel'}
            style={{ width: '90vw', height: '85vh', border: 'none', borderRadius: 8, background: 'var(--bg-paper)' }}
            onLoad={() => setLoading(false)}
            onError={() => setLoading(false)}
          />
        );
      }
      case 'word': {
        const viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(item.src)}`;
        return (
          <iframe
            src={viewerUrl}
            title={item.name || 'Word'}
            style={{ width: '90vw', height: '85vh', border: 'none', borderRadius: 8, background: 'var(--bg-paper)' }}
            onLoad={() => setLoading(false)}
            onError={() => setLoading(false)}
          />
        );
      }
      default: {
        // Document card fallback
        const isExcel = item.name?.match(/\.(xls|xlsx|csv)$/i);
        const isWord = item.name?.match(/\.(doc|docx)$/i);
        const Icon = isExcel ? FileSpreadsheet : isWord ? FileText : File;
        const color = isExcel ? '#217346' : isWord ? '#2B579A' : '#4285F4';

        return (
          <Box sx={{ color: 'var(--button-color)', textAlign: 'center', p: 4 }}>
            <Icon size={80} style={{ color, marginBottom: 16 }} />
            <Typography variant="h6">{item.name || 'Document'}</Typography>
            <Typography variant="body2" sx={{ mt: 1, opacity: 0.7 }}>
              Preview not available for this file type
            </Typography>
          </Box>
        );
      }
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="media-viewer-overlay" onClick={handleOverlayClick}>
      {/* Top toolbar */}
      <div className="media-viewer-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            className="media-viewer-btn media-viewer-btn--close"
            onClick={onClose}
            aria-label="Close"
            title="Close (Esc)"
          >
            <X size={20} />
          </button>
          {items.length > 1 && (
            <span className="media-viewer-counter">
              {currentIndex + 1} / {items.length}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            className="media-viewer-btn"
            onClick={handleDownload}
            aria-label="Download"
            title="Download"
          >
            <Download size={20} />
          </button>
          {currentType === 'image' && (
            <button
              className="media-viewer-btn"
              onClick={() => setZoomed((z) => !z)}
              aria-label={zoomed ? 'Zoom out' : 'Zoom in'}
              title={zoomed ? 'Fit to screen' : 'Full size'}
            >
              {zoomed ? <ZoomOut size={20} /> : <ZoomIn size={20} />}
            </button>
          )}
        </div>
      </div>

      {/* Navigation arrows */}
      {items.length > 1 && (
        <>
          <button
            onClick={goPrev}
            className="media-viewer-nav-btn media-viewer-prev"
            aria-label="Previous"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            onClick={goNext}
            className="media-viewer-nav-btn media-viewer-next"
            aria-label="Next"
          >
            <ChevronRight size={24} />
          </button>
        </>
      )}

      {/* Media content */}
      <div className="media-viewer-content" ref={containerRef}>
        {loading && currentType !== 'video' && currentType !== 'audio' && (
          <div className="media-viewer-loading">
            <CircularProgress size={40} sx={{ color: 'var(--button-color)' }} />
          </div>
        )}
        {renderContent()}
      </div>

      {/* Hint */}
      <div className="media-viewer-hint">
        {currentType === 'image' ? 'Click image to zoom · ' : ''}
        Press Esc to close · Click outside to close
      </div>
    </div>
  );
}
