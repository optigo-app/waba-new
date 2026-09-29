'use client';

import { useRef, useEffect } from 'react';
import { IconButton, CircularProgress } from '@mui/material';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Keyboard, Mousewheel } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';
import {
  X, Plus, Paperclip, Smile, Send, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { getStaticUrl } from '../../utils/globalFunc';

export default function MediaPreviewOverlay({
  mediaPreview,
  selectedPreviewIndex,
  onSelectIndex,
  isSendingMedia,
  onClear,
  onRemove,
  onAddMore,
  input,
  setInput,
  handleSend,
  sending,
  emojiPickerOpen,
  setEmojiPickerOpen,
  onDragEnter,
  onDragOver,
  onDragLeave,
  onDrop,
}) {
  const swiperRef = useRef(null);
  const thumbRowRef = useRef(null);

  // Sync Swiper when thumbnail is clicked externally
  useEffect(() => {
    if (swiperRef.current && swiperRef.current.activeIndex !== selectedPreviewIndex) {
      swiperRef.current.slideTo(selectedPreviewIndex);
    }
  }, [selectedPreviewIndex]);

  // Keep selected index in bounds when previews are removed
  useEffect(() => {
    if (selectedPreviewIndex >= mediaPreview.length) {
      onSelectIndex(Math.max(0, mediaPreview.length - 1));
    }
  }, [mediaPreview.length, selectedPreviewIndex, onSelectIndex]);

  // Auto-scroll thumbnail row so active thumb stays visible
  useEffect(() => {
    const row = thumbRowRef.current;
    if (!row) return;
    const activeThumb = row.children[selectedPreviewIndex];
    if (!activeThumb) return;
    activeThumb.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [selectedPreviewIndex]);

  // Escape key closes overlay, Enter sends media
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape' && !isSendingMedia) {
        onClear();
      }
      if (e.key === 'Enter' && !e.shiftKey && !isSendingMedia && !sending) {
        // Don't send if user is typing in the caption input (handled natively there)
        const activeTag = document.activeElement?.tagName?.toLowerCase();
        const isTyping = activeTag === 'input' || activeTag === 'textarea';
        if (!isTyping) {
          e.preventDefault();
          handleSend();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isSendingMedia, sending, onClear, handleSend]);

  const current = mediaPreview[selectedPreviewIndex];

  const getDocIcon = (name = '') => {
    const lower = name.toLowerCase();
    if (lower.endsWith('.pdf')) return getStaticUrl('/pdf.png');
    if (lower.endsWith('.doc') || lower.endsWith('.docx')) return getStaticUrl('/doc.png');
    if (lower.endsWith('.txt')) return getStaticUrl('/txt.png');
    if (lower.endsWith('.xls') || lower.endsWith('.xlsx')) return getStaticUrl('/excel.png');
    if (lower.endsWith('.ppt') || lower.endsWith('.pptx')) return getStaticUrl('/ppt.png');
    return getStaticUrl('/pdf.png');
  };

  const formatSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div
      className="media-preview-overlay"
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Header */}
      <div className="media-preview-header">
        <div className="media-preview-file-info">
          <span className="media-preview-file-name">{current?.name}</span>
          <span className="media-preview-file-meta">
            {mediaPreview.length} file{mediaPreview.length > 1 ? 's' : ''}
            {current?.size ? ` · ${formatSize(current.size)}` : ''}
          </span>
        </div>
        <button
          className="media-preview-close"
          onClick={onClear}
          disabled={isSendingMedia}
          aria-label="Close preview"
        >
          <X size={20} />
        </button>
      </div>

      {/* Main Swiper */}
      <div className="media-preview-main">
        <Swiper
          modules={[Navigation, Keyboard, Mousewheel]}
          pagination={{ clickable: true }}
          navigation={{
            prevEl: '.media-preview-nav-prev',
            nextEl: '.media-preview-nav-next',
          }}
          keyboard={{ enabled: true }}
          mousewheel={{ forceToAxis: true }}
          onSwiper={(swiper) => { swiperRef.current = swiper; }}
          onSlideChange={(swiper) => onSelectIndex(swiper.activeIndex)}
          initialSlide={selectedPreviewIndex}
          className="media-preview-swiper"
        >
          {mediaPreview.map((preview, i) => (
            <SwiperSlide key={`${preview.name}-${i}`}>
              {preview.type === 'image' ? (
                <img src={preview.previewUrl} alt={preview.name} className="media-preview-slide-img" />
              ) : preview.type === 'video' ? (
                <video src={preview.previewUrl} className="media-preview-slide-img" controls />
              ) /* : preview.type === 'audio' ? (
                <audio src={preview.previewUrl} controls style={{ width: '80%', maxWidth: 500 }} />
              ) */ : (
                <div className="media-preview-slide-doc">
                  <img src={getDocIcon(preview.name)} alt="document" style={{ width: 100, height: 100, objectFit: 'contain' }} />
                  <span>{preview.name}</span>
                </div>
              )}
            </SwiperSlide>
          ))}
        </Swiper>

        {/* Custom theme nav buttons */}
        {mediaPreview.length > 1 && (
          <>
            <button className="media-preview-nav-prev" aria-label="Previous">
              <ChevronLeft size={28} />
            </button>
            <button className="media-preview-nav-next" aria-label="Next">
              <ChevronRight size={28} />
            </button>
          </>
        )}
      </div>

      {/* Thumbnails + caption */}
      <div className="media-preview-footer">
        <div className="media-preview-thumb-row" ref={thumbRowRef}>
          {mediaPreview.map((preview, i) => (
            <div
              key={`thumb-${preview.name}-${i}`}
              className={`media-preview-thumb-item ${i === selectedPreviewIndex ? 'active' : ''}`}
              onClick={() => onSelectIndex(i)}
              role="button"
              tabIndex={0}
              aria-label={`Select ${preview.name}`}
            >
              {preview.type === 'image' ? (
                <img src={preview.previewUrl} alt="" />
              ) : preview.type === 'video' ? (
                <img src={getStaticUrl('/video.png')} alt="video" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 4 }} />
              ) /* : preview.type === 'audio' ? (
                <span style={{ fontSize: 10, color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>AUDIO</span>
              ) */ : (
                <img src={getDocIcon(preview.name)} alt="document" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              )}
              <button
                className="media-preview-thumb-remove"
                onClick={(e) => { e.stopPropagation(); onRemove(i); }}
                disabled={isSendingMedia}
                aria-label={`Remove ${preview.name}`}
              >
                <X size={10} />
              </button>
            </div>
          ))}
          <button
            className="media-preview-add-thumb"
            onClick={onAddMore}
            disabled={isSendingMedia}
            aria-label="Add more files"
          >
            <Plus size={18} />
          </button>
        </div>

        <div className="media-preview-caption-row">
          <IconButton size="small" onClick={onAddMore} disabled={isSendingMedia}>
            <Paperclip size={18} />
          </IconButton>
          <input
            type="text"
            className="media-preview-caption-input"
            placeholder="Add a caption..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <IconButton size="small" onClick={() => setEmojiPickerOpen((prev) => !prev)}>
            <Smile size={20} />
          </IconButton>
          <button
            className="chat-send-btn"
            onClick={handleSend}
            disabled={sending || (!input.trim() && mediaPreview.length === 0)}
          >
            {sending ? <CircularProgress size={18} sx={{ color: 'var(--button-color)' }} /> : <Send size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
}
