'use client';

import { useState, useRef, memo, useEffect, useMemo } from 'react';
import { Avatar, Skeleton, Tooltip, Box, Typography } from '@mui/material';
import { MoreVertical, ChevronDown, Paperclip, Download, AlertCircle, Clock3, Check, CheckCheck, Play, Pause } from 'lucide-react';
import DynamicTemplate from './DynamicTemplate';
import QuickReactionMenu from './QuickReactionMenu';
import { Emoji } from 'emoji-picker-react';
import { parseTemplateData } from './utils/chatUtils';
import WhatsAppText from './WhatsAppText';
import { extractTimeFromISO } from './utils/dateUtils';

const charToUnified = (char) => {
  if (!char) return null;
  return Array.from(char)
    .map((c) => c.codePointAt(0).toString(16))
    .filter((hex) => hex !== 'fe0f')
    .join('-');
};

const imageDimsCache = new Map();
const MAX_DIMS_CACHE_SIZE = 200;

const setImageDimsCached = (key, dims) => {
  if (!key) return;
  if (imageDimsCache.size >= MAX_DIMS_CACHE_SIZE) {
    const first = imageDimsCache.keys().next().value;
    if (first) imageDimsCache.delete(first);
  }
  imageDimsCache.set(key, dims);
};

const calculateImageDimensions = (naturalWidth, naturalHeight) => {
  const MAX_W = 300;   // WhatsApp max image width
  const MAX_H = 380;   // WhatsApp max image height (tall portraits)

  // Uniform scale-down to fit within max box while preserving exact aspect ratio
  const scale = Math.min(1, MAX_W / naturalWidth, MAX_H / naturalHeight);

  return {
    width: Math.round(naturalWidth * scale),
    height: Math.round(naturalHeight * scale),
  };
};

const MessageBubble = memo(function MessageBubble({
  msg,
  messageId,
  isOutgoing,
  baseAvatarConfig,
  messageReactions,
  loadedMedia,
  setLoadedMedia,
  mediaCache,
  requestMediaFetch,
  setMediaViewer,
  reactionPickerMessageId,
  setReactionPickerMessageId,
  onContextMenuOpen,
  onReactionSelect,
  onExternalLinkClick,
  blinkMessageId,
  scrollToMessage,
}) {
  const msgType = msg?.type || msg?.MessageType || 'text';
  const rawImageSrc = msg?.mediaUrl || msg?.imageUrl || msg?.MediaUrl;
  const resolveMediaUrl = (val) => {
    // If the message itself has a direct FileUrl, use it
    const directUrl = msg?.FileUrl;
    if (directUrl && typeof directUrl === 'string' && directUrl.startsWith('http')) return directUrl;
    if (!val || typeof val !== 'string') return val;
    if (val.startsWith('http') || val.startsWith('blob:') || val.startsWith('data:')) return val;
    return mediaCache?.[val] || val;
  };
  const imageSrc = resolveMediaUrl(rawImageSrc);
  const cachedDims = rawImageSrc ? imageDimsCache.get(rawImageSrc) : null;

  // If the message already has a direct FileUrl, skip skeleton (image was preloaded)
  // But still wait for onLoad before showing opacity=1 to avoid blink
  const hasDirectFileUrl = msg?.FileUrl && typeof msg.FileUrl === 'string' && msg.FileUrl.startsWith('http');
  const isMediaLoaded = loadedMedia[messageId];
  const showSkeleton = !isMediaLoaded && !hasDirectFileUrl;

  const [hovered, setHovered] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [imageDims, setImageDims] = useState(cachedDims);
  const [videoDims, setVideoDims] = useState(null);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const messageRef = useRef(null);
  const bubbleRef = useRef(null);
  const imgRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      bubbleRef.current?.classList.add('animated');
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  // Detect browser-cached images that completed before onLoad handler was attached.
  // This prevents the skeleton overlay from being stuck when switching conversations.
  useEffect(() => {
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0 && !isMediaLoaded) {
      setLoadedMedia((prev) => ({ ...prev, [messageId]: true }));
    }
  }, [imageSrc, isMediaLoaded, messageId, setLoadedMedia]);

  // Same check for cached videos
  useEffect(() => {
    if (videoRef.current && videoRef.current.readyState >= 2 && !isMediaLoaded) {
      setLoadedMedia((prev) => ({ ...prev, [messageId]: true }));
    }
  }, [isMediaLoaded, messageId, setLoadedMedia]);

  const isAudio = msgType?.toLowerCase() === 'audio' || msg?.audioUrl || (msg?.mediaUrl && msg?.mediaUrl.match(/\.(mp3|ogg|wav|m4a|aac|opus|webm)$/i)) || (msg?.MediaUrl && msg?.MediaUrl.match(/\.(mp3|ogg|wav|m4a|aac|opus|webm)$/i));
  const hasMedia = msgType?.toLowerCase() === 'image' || msgType?.toLowerCase() === 'video' || msgType?.toLowerCase() === 'document' || isAudio || msg?.mediaUrl || msg?.imageUrl || msg?.documentUrl || msg?.MediaUrl;

  // Compute mediaId that needs lazy fetching — only recomputes when relevant fields change
  const mediaIdToFetch = useMemo(() => {
    if (!hasMedia || !requestMediaFetch) return null;
    const directUrl = msg?.FileUrl;
    if (directUrl && typeof directUrl === 'string' && directUrl.startsWith('http')) return null;
    const candidates = [
      msg?.mediaUrl,
      msg?.MediaUrl,
      msg?.mediaId,
      msg?.imageUrl,
      msg?.documentUrl,
      msg?.videoUrl,
      msg?.audioUrl,
    ];
    for (const val of candidates) {
      if (!val || typeof val !== 'string') continue;
      if (val.startsWith('http') || val.startsWith('blob:') || val.startsWith('data:')) continue;
      if (mediaCache?.[val]) continue;
      return val;
    }
    return null;
  }, [
    hasMedia, requestMediaFetch,
    msg?.FileUrl,
    msg?.mediaUrl, msg?.MediaUrl, msg?.mediaId,
    msg?.imageUrl, msg?.documentUrl, msg?.videoUrl, msg?.audioUrl,
    mediaCache,
  ]);

  // Lazy load media when message bubble enters viewport
  useEffect(() => {
    if (!mediaIdToFetch) return;
    const el = messageRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            requestMediaFetch(mediaIdToFetch);
            observer.disconnect();
          }
        });
      },
      { root: null, rootMargin: '200px', threshold: 0 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [mediaIdToFetch, requestMediaFetch]);
  const replyData = msg?.ContextType === 2 ? msg?.ReplyContext || msg?.replyTo : null;
  const isPickerOpen = reactionPickerMessageId === messageId;
  const isBlinking = blinkMessageId === messageId;

  const mentionLabel = (() => {
    const text = msg?.content || msg?.message || msg?.text || msg?.Message || '';
    const lower = text.toLowerCase();
    if (lower.includes('@admin')) return '@admin';
    if (lower.includes('@all')) return '@all';
    return null;
  })();

  const handleMouseEnter = () => {
    setHovered(true);
  };

  const handleMouseLeave = () => {
    setHovered(false);
  };

  return (
    <div
      ref={messageRef}
      className={`message-item ${isOutgoing ? 'user-message' : 'customer-message'} ${isBlinking ? 'blink-message' : ''} ${messageReactions[messageId] ? 'has-reaction' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      data-message-id={messageId}
    >
      {!isOutgoing && (
        <Avatar
          {...baseAvatarConfig}
          sx={{ ...baseAvatarConfig.sx, width: 28, height: 28, mr: 1, flexShrink: 0 }}
        />
      )}
      <div className="message-content">
        {/* Hover actions */}
        {(hovered || isPickerOpen) && (
          <div className={`message-actions ${isPickerOpen ? 'picker-open' : ''}`}>
            <QuickReactionMenu
              isOpen={isPickerOpen}
              onToggle={() => setReactionPickerMessageId((prev) => (prev === messageId ? null : messageId))}
              onSelect={(emoji) => onReactionSelect(msg, emoji)}
            />
            {msgType !== 'template' && (
              <button
                className="menu-btn"
                onClick={(e) => onContextMenuOpen(e, msg)}
                title="More"
              >
                <MoreVertical size={18} />
              </button>
            )}
          </div>
        )}

        <div className="message-bubble-wrap">
          {mentionLabel && (
            <div className="message-mention-label">
              <span>{mentionLabel}</span>
            </div>
          )}
          <div
            ref={bubbleRef}
            className={`message-bubble ${isOutgoing ? 'user' : 'customer'} ${msg?.isUploading ? 'uploading' : ''}`}
            onContextMenu={(e) => onContextMenuOpen(e, msg)}
          >
          {/* WhatsApp-like top-right menu icon */}
          {msgType !== 'template' && (
            <button
              className="message-top-right-btn"
              onClick={(e) => onContextMenuOpen(e, msg)}
              title="More"
            >
              <ChevronDown size={22} />
            </button>
          )}

          {/* Reply preview inside bubble */}
          {replyData && (
            <div
              className="message-reply-indicator"
              style={{ cursor: msg?.ContextId ? 'pointer' : 'default', opacity: msg?.ContextId ? 1 : 0.7 }}
              onClick={() => msg?.ContextId && scrollToMessage?.(msg.ContextId)}
            >
              <div className="reply-indicator-line" />
              <div className="reply-indicator-content">
                <div className="reply-indicator-sender">
                  {replyData.sender || replyData.Sender || 'Customer'}
                </div>
                <div className="reply-indicator-text">
                  {(replyData.text || replyData.Text || replyData.ReplyContextMsg || '').length > 50
                    ? `${(replyData.text || replyData.Text || replyData.ReplyContextMsg || '').substring(0, 50)}...`
                    : (replyData.text || replyData.Text || replyData.ReplyContextMsg || '')}
                </div>
              </div>
            </div>
          )}

          {(() => {
            if (msgType === 'template') return null;

            const isMediaMsg = msgType?.toLowerCase() === 'image' || msgType?.toLowerCase() === 'video' || msgType?.toLowerCase() === 'document' || isAudio || msg?.documentUrl || msg?.DocumentUrl || msg?.fileName || msg?.MediaUrl;
            const captionText = isMediaMsg
              ? (msg?.Message || msg?.message || msg?.text || '')
              : (msg?.content || msg?.message || msg?.text || msg?.Message || '');
            const isJustFilename = isMediaMsg && captionText === (msg?.fileName || msg?.content || '');
            const hasCaption = !!captionText && !isJustFilename;

            // Pre-compute dims from stored message fields so skeleton matches real media size
            const storedImgW = msg?.mediaWidth || msg?.MediaWidth || msg?.width || 0;
            const storedImgH = msg?.mediaHeight || msg?.MediaHeight || msg?.height || 0;
            const preImageDims = (!imageDims && storedImgW > 0 && storedImgH > 0)
              ? calculateImageDimensions(storedImgW, storedImgH)
              : imageDims;

            const storedVidW = msg?.mediaWidth || msg?.MediaWidth || msg?.width || 0;
            const storedVidH = msg?.mediaHeight || msg?.MediaHeight || msg?.height || 0;
            const preVideoDims = (!videoDims && storedVidW > 0 && storedVidH > 0)
              ? calculateImageDimensions(storedVidW, storedVidH)
              : videoDims;

            const captionMediaWidth = (() => {
              if (msgType?.toLowerCase() === 'image' || msg?.imageUrl) {
                return preImageDims ? preImageDims.width : 320;
              }
              if (msgType?.toLowerCase() === 'video' || msg?.videoUrl || (msg?.mediaUrl && msg?.mediaUrl.match(/\.(mp4|webm|ogg|mov)$/i)) || (msg?.MediaUrl && msg?.MediaUrl.match(/\.(mp4|webm|ogg|mov)$/i))) {
                return preVideoDims ? preVideoDims.width : 'min(330px, 70vw)';
              }
              if (isAudio) {
                return 'min(280px, 70vw)';
              }
              return 'min(320px, 70vw)';
            })();

            const mediaStyle = hasCaption
              ? { width: captionMediaWidth, minHeight: 'auto' }
              : (() => {
                if (msgType?.toLowerCase() === 'image' || msg?.imageUrl) {
                  return preImageDims ? { width: preImageDims.width, minHeight: 'auto' } : { width: 260, minHeight: 'auto' };
                }
                if (msgType?.toLowerCase() === 'video' || msg?.videoUrl || (msg?.mediaUrl && msg?.mediaUrl.match(/\.(mp4|webm|ogg|mov)$/i)) || (msg?.MediaUrl && msg?.MediaUrl.match(/\.(mp4|webm|ogg|mov)$/i))) {
                  return preVideoDims ? { width: preVideoDims.width, minHeight: 'auto' } : { minHeight: 'auto' };
                }
                if (isAudio) {
                  return { width: 'min(280px, 70vw)', minHeight: 'auto' };
                }
                if (msgType?.toLowerCase() === 'document' || msg?.documentUrl || msg?.DocumentUrl || msg?.fileName) {
                  return { minHeight: 'auto' };
                }
                return {};
              })();

            const mediaBlock = (
              <div className="message-media" style={mediaStyle}>
                {msgType?.toLowerCase() === 'image' || msg?.imageUrl ? (
                  <>
                    <div
                      className="message-image-wrapper"
                      style={preImageDims ? { position: 'relative', width: preImageDims.width, height: preImageDims.height, maxWidth: '100%' } : { position: 'relative', width: 260, height: 200, maxWidth: '100%' }}
                      onClick={() =>
                        setMediaViewer({
                          open: true,
                          src: imageSrc,
                          filename: msg?.content || msg?.Message || 'image',
                          type: 'image',
                        })
                      }
                    >
                      {showSkeleton && (
                        <Skeleton
                          variant="rectangular"
                          width="100%"
                          height="100%"
                          sx={{ borderRadius: '8px', position: 'absolute', inset: 0, zIndex: 1 }}
                        />
                      )}
                      <img
                        ref={imgRef}
                        src={imageSrc}
                        alt="media"
                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8, opacity: (isMediaLoaded || hasDirectFileUrl) ? 1 : 0, transition: 'opacity 0.3s ease', position: 'relative', zIndex: 2 }}
                        onLoad={(e) => {
                          const w = e?.target?.naturalWidth || 0;
                          const h = e?.target?.naturalHeight || 0;
                          if (w > 0 && h > 0) {
                            const dims = calculateImageDimensions(w, h);
                            setImageDims(dims);
                            if (rawImageSrc) setImageDimsCached(rawImageSrc, dims);
                          }
                          setLoadedMedia((prev) => ({ ...prev, [messageId]: true }));
                        }}
                        onError={(e) => {
                          // If src is still a raw media ID (not a real URL), keep skeleton
                          // visible until the cache populates with a valid URL
                          if (imageSrc && /^(https?:|blob:|data:)/i.test(imageSrc)) {
                            setLoadedMedia((prev) => ({ ...prev, [messageId]: true }));
                          }
                        }}
                      />
                    </div>
                  </>
                ) : msgType?.toLowerCase() === 'video' || (msg?.mediaUrl && msg?.mediaUrl.match(/\.(mp4|webm|ogg|mov)$/i)) || (msg?.MediaUrl && msg?.MediaUrl.match(/\.(mp4|webm|ogg|mov)$/i)) ? (
                  <div
                    className="message-video-wrapper"
                    style={preVideoDims ? { width: preVideoDims.width, height: preVideoDims.height, maxWidth: '100%' } : { width: 260, height: 200, maxWidth: '100%' }}
                  >
                    <div
                      className="message-video-inner"
                      style={{ position: 'relative' }}
                      onClick={() => {
                        if (videoRef.current) {
                          if (videoRef.current.paused) {
                            videoRef.current.play();
                          } else {
                            videoRef.current.pause();
                          }
                        }
                      }}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        if (videoRef.current) videoRef.current.pause();
                        setMediaViewer({
                          open: true,
                          src: resolveMediaUrl(msg?.mediaUrl || msg?.videoUrl || msg?.MediaUrl),
                          filename: msg?.content || msg?.Message || 'video',
                          type: 'video',
                        });
                      }}
                    >
                      {showSkeleton && (
                        <Skeleton
                          variant="rectangular"
                          width="100%"
                          height="100%"
                          sx={{ borderRadius: '8px', position: 'absolute', inset: 0, zIndex: 1 }}
                        />
                      )}
                      <video
                        ref={videoRef}
                        src={resolveMediaUrl(msg?.mediaUrl || msg?.videoUrl || msg?.MediaUrl)}
                        onLoadedMetadata={(e) => {
                          const w = e?.target?.videoWidth || 0;
                          const h = e?.target?.videoHeight || 0;
                          if (w > 0 && h > 0) {
                            const dims = calculateImageDimensions(w, h);
                            setVideoDims(dims);
                          }
                          setLoadedMedia((prev) => ({ ...prev, [messageId]: true }));
                        }}
                        onError={() => {
                          const vidSrc = resolveMediaUrl(msg?.mediaUrl || msg?.videoUrl || msg?.MediaUrl);
                          if (vidSrc && /^(https?:|blob:|data:)/i.test(vidSrc)) {
                            setLoadedMedia((prev) => ({ ...prev, [messageId]: true }));
                          }
                        }}
                        onPlay={() => setIsPlaying(true)}
                        onPause={() => setIsPlaying(false)}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          borderRadius: 8,
                          opacity: (isMediaLoaded || hasDirectFileUrl) ? 1 : 0,
                          transition: 'opacity 0.3s ease',
                          position: 'relative',
                          zIndex: 2,
                        }}
                      />
                      {/* Play overlay */}
                      {!isPlaying && isMediaLoaded && (
                        <div className="video-play-overlay">
                          <div className="video-play-btn">
                            <div className="video-play-triangle" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : isAudio ? (
                  <AudioPlayer
                    src={resolveMediaUrl(msg?.audioUrl || msg?.mediaUrl || msg?.MediaUrl)}
                    messageId={messageId}
                    loadedMedia={loadedMedia}
                    setLoadedMedia={setLoadedMedia}
                    audioRef={audioRef}
                    isPlaying={isAudioPlaying}
                    setIsPlaying={setIsAudioPlaying}
                    progress={audioProgress}
                    setProgress={setAudioProgress}
                    duration={audioDuration}
                    setDuration={setAudioDuration}
                  />
                ) : msgType?.toLowerCase() === 'document' || msg?.documentUrl || msg?.DocumentUrl || msg?.fileName ? (
                  <DocumentCard
                    msg={msg}
                    setMediaViewer={setMediaViewer}
                    mediaCache={mediaCache}
                  />
                ) : (
                  <div className="message-doc">
                    <Paperclip size={18} />
                    <span>{msg?.MediaName || msg?.content || msg?.Message || msg?.fileName || 'Document'}</span>
                  </div>
                )}
                {msg?.isUploading && msg?.percent !== undefined && (
                  <UploadProgressOverlay percent={msg.percent} />
                )}
              </div>
            );

            const textBlock = (
              <div className="message-text">
                <WhatsAppText text={captionText} onLinkClick={onExternalLinkClick} />
              </div>
            );

            const firstUrl = (() => {
              if (!captionText) return null;
              const match = captionText.match(/https?:\/\/[^\s]+/i);
              return match ? match[0] : null;
            })();
            const linkPreviewBlock = !hasMedia && firstUrl ? (
              <LinkPreview url={firstUrl} />
            ) : null;

            if (hasMedia && hasCaption) {
              return (
                <div className="message-media-caption-wrap">
                  {mediaBlock}
                  {textBlock}
                </div>
              );
            }

            return (
              <>
                {hasMedia && mediaBlock}
                {hasCaption && textBlock}
                {linkPreviewBlock}
              </>
            );
          })()}

          {/* Template card */}
          {(() => {
            const tData = parseTemplateData(msg);
            if (!tData.isTemplate) return null;
            return (
              <DynamicTemplate
                templateName={tData.templateName}
                params={tData.params}
                language={tData.language}
                components={tData.components}
              />
            );
          })()}

          <div className="message-meta">
            <span className="message-time">
              {msg?.dateTime ||
                (msg?.DateTime && extractTimeFromISO(msg.DateTime)) ||
                new Date(msg?.sentAt || msg?.sent_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
            </span>
            <MessageStatusIcon msg={msg} />
          </div>

          {/* Reaction display — merge API ReactionEmojis + real-time messageReactions */}
          {(() => {
            const apiReactions = (() => {
              const raw = msg?.ReactionEmojis || msg?.reactionEmojis;
              if (!raw) return [];
              try {
                const parsed = JSON.parse(raw);
                return Array.isArray(parsed) ? parsed : [];
              } catch {
                return [];
              }
            })();

            const realtimeEmoji = messageReactions?.[messageId];
            const allReactions = [...apiReactions];
            if (realtimeEmoji) {
              // Overwrite or append real-time reaction from current user (Direction: 1)
              const existing = allReactions.find((r) => r.Reaction === realtimeEmoji);
              if (!existing) {
                allReactions.push({ Reaction: realtimeEmoji, Direction: 1 });
              }
            }

            if (allReactions.length === 0) return null;

            return (
              <div className="message-reaction-badge">
                {allReactions.map((r, idx) => {
                  const emoji = r.Reaction || r.reaction;
                  if (!emoji) return null;
                  const unified = charToUnified(emoji);
                  return (
                    <span key={`${emoji}-${idx}`} className="message-reaction-emoji">
                      {unified ? <Emoji unified={unified} size={18} emojiStyle="apple" /> : emoji}
                    </span>
                  );
                })}
              </div>
            );
          })()}
        </div>
        {msg?.SenderInfo && (
          <div className="message-sender-info-label">
            <span>@{msg.SenderInfo}</span>
          </div>
        )}
        </div>
      </div>
    </div>
  );
});

/* Document icon helper */
const getDocIcon = (name = '', mimeType = '') => {
  const lower = name.toLowerCase();
  const mt = (mimeType || '').toLowerCase();
  if (lower.endsWith('.pdf') || mt === 'application/pdf') return '/pdf.png';
  if (lower.endsWith('.doc') || lower.endsWith('.docx') || mt.includes('wordprocessingml') || mt === 'application/msword') return '/word.png';
  if (lower.endsWith('.txt') || mt === 'text/plain') return '/txt.png';
  if (lower.endsWith('.xls') || lower.endsWith('.xlsx') || mt.includes('spreadsheetml') || mt === 'application/vnd.ms-excel') return '/excel.png';
  if (lower.endsWith('.ppt') || lower.endsWith('.pptx') || mt.includes('presentationml') || mt === 'application/vnd.ms-powerpoint') return '/word.png';
  return '/pdf.png';
};

/* Document Card */
function DocumentCard({ msg, setMediaViewer, mediaCache }) {
  const fileName = msg?.MediaName || msg?.fileName || msg?.content || msg?.Message || 'Document';
  const mimeType = msg?.MimeType || msg?.mimeType || '';
  const ext = (fileName.split('.').pop() || '').toUpperCase();
  const resolveMediaUrl = (val) => {
    const directUrl = msg?.FileUrl;
    if (directUrl && typeof directUrl === 'string' && directUrl.startsWith('http')) return directUrl;
    if (!val || typeof val !== 'string') return val;
    if (val.startsWith('http') || val.startsWith('blob:') || val.startsWith('data:')) return val;
    return mediaCache?.[val] || val;
  };
  const href = resolveMediaUrl(msg?.documentUrl || msg?.DocumentUrl || msg?.mediaUrl || msg?.MediaUrl);

  const docIcon = getDocIcon(fileName, mimeType);

  return (
    <div
      className="message-document-card"
      onClick={() =>
        href &&
        setMediaViewer({
          open: true,
          src: href,
          filename: fileName,
          type: 'document',
        })
      }
    >
      <div className="message-document-icon">
        <img src={docIcon} alt="document" style={{ width: 24, height: 24, objectFit: 'contain' }} />
      </div>
      <div className="message-document-info">
        <div className="message-document-name" title={fileName}>
          {fileName}
        </div>
        <div className="message-document-ext">{ext || 'FILE'}</div>
      </div>
      <a
        className="message-document-download"
        href={href}
        download={fileName}
        title="Download"
        onClick={async (e) => {
          e.stopPropagation();
          if (!href || (!href.startsWith('http') && !href.startsWith('blob:') && !href.startsWith('data:'))) {
            e.preventDefault();
            return;
          }
          // For cross-origin URLs, fetch blob then trigger download via object URL
          if (href.startsWith('http')) {
            e.preventDefault();
            try {
              const res = await fetch(href);
              if (!res.ok) throw new Error('Failed to fetch');
              const blob = await res.blob();
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = fileName;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              window.URL.revokeObjectURL(url);
            } catch {
              // Fallback: open in new tab
              window.open(href, '_blank');
            }
          }
        }}
      >
        <Download size={18} />
      </a>
    </div>
  );
}

/* Broken Media Card — shown when image/video fails to load */
function BrokenMediaCard({ msg, setMediaViewer, mediaCache }) {
  const fileName = msg?.MediaName || msg?.fileName || msg?.content || msg?.Message || 'Media';
  const ext = (fileName.split('.').pop() || '').toUpperCase() || 'IMAGE';
  const resolveMediaUrl = (val) => {
    const directUrl = msg?.FileUrl;
    if (directUrl && typeof directUrl === 'string' && directUrl.startsWith('http')) return directUrl;
    if (!val || typeof val !== 'string') return val;
    if (val.startsWith('http') || val.startsWith('blob:') || val.startsWith('data:')) return val;
    return mediaCache?.[val] || val;
  };
  const href = resolveMediaUrl(msg?.mediaUrl || msg?.imageUrl || msg?.MediaUrl);

  return (
    <div
      className="message-broken-media-card"
      onClick={() =>
        href &&
        setMediaViewer({
          open: true,
          src: href,
          filename: fileName,
          type: 'image',
        })
      }
    >
      <div className="message-broken-media-icon" style={{ backgroundColor: 'rgba(255,68,68,0.12)', color: '#ff4444' }}>
        <AlertCircle size={22} />
      </div>
      <div className="message-broken-media-info">
        <div className="message-broken-media-name" title={fileName}>
          {fileName}
        </div>
        <div className="message-broken-media-ext">{ext} — Unavailable</div>
      </div>
      <a
        className="message-broken-media-action"
        href={href}
        download={fileName}
        title="Try download"
        onClick={async (e) => {
          e.stopPropagation();
          if (!href || (!href.startsWith('http') && !href.startsWith('blob:') && !href.startsWith('data:'))) {
            e.preventDefault();
            return;
          }
          if (href.startsWith('http')) {
            e.preventDefault();
            try {
              const res = await fetch(href);
              if (!res.ok) throw new Error('Failed to fetch');
              const blob = await res.blob();
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = fileName;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              window.URL.revokeObjectURL(url);
            } catch {
              window.open(href, '_blank');
            }
          }
        }}
      >
        <Download size={18} />
      </a>
    </div>
  );
}

/* Upload progress overlay */
function UploadProgressOverlay({ percent, size = 48 }) {
  const safe = Math.max(0, Math.min(100, Number(percent) || 0));
  return (
    <div className="upload-progress-overlay">
      <div className="upload-progress-ring">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle
            cx={size / 2} cy={size / 2} r={(size - 6) / 2}
            fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={4}
          />
          <circle
            cx={size / 2} cy={size / 2} r={(size - 6) / 2}
            fill="none" stroke="#fff" strokeWidth={4}
            strokeDasharray={`${2 * Math.PI * (size - 6) / 2}`}
            strokeDashoffset={`${2 * Math.PI * (size - 6) / 2 * (1 - safe / 100)}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ transition: 'stroke-dashoffset 0.3s ease' }}
          />
        </svg>
        <span className="upload-progress-text">{Math.round(safe)}%</span>
      </div>
    </div>
  );
}

/* Per-message status icon with failed tooltip */
function MessageStatusIcon({ msg }) {
  const status = typeof msg?.Status === 'number'
    ? msg.Status
    : (msg?.status === 'pending' || msg?.Status === 'pending' || msg?.isUploading ? 0 : -1);

  if (msg?.direction !== 1 && msg?.Direction !== 1) return null;

  if (status === 4 || msg?.status === 'failed') {
    let errorTitle = 'Message Failed';
    let errorDetails = '';
    try {
      if (msg?.FailedReason || msg?.FailedReson) {
        const parsed = JSON.parse(msg?.FailedReason || msg?.FailedReson);
        errorTitle = parsed.title || parsed.message || 'Message Failed';
        errorDetails = parsed.error_data?.details || parsed.details || '';
      }
    } catch (e) {
      errorTitle = msg?.FailedReason || msg?.FailedReson || 'Message failed to deliver';
    }

    return (
      <Tooltip
        title={
          <Box sx={{ p: 0.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#fff', fontSize: 13 }}>
              {errorTitle}
            </Typography>
            {errorDetails && (
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, fontStyle: 'italic' }}>
                {errorDetails}
              </Typography>
            )}
          </Box>
        }
        arrow
        placement="top"
      >
        <span className="message-status" style={{ color: '#ff4444', display: 'inline-flex', alignItems: 'center' }}>
          <AlertCircle size={14} />
        </span>
      </Tooltip>
    );
  }

  if (status === 0 || msg?.isUploading || msg?.status === 'pending' || msg?.Status === 'pending') {
    return (
      <span className="message-status" style={{ color: '#9e9e9e', display: 'inline-flex', alignItems: 'center' }}>
        <Clock3 size={15} />
      </span>
    );
  }

  if (status === 3) {
    return (
      <span className="message-status" style={{ color: '#1F51FF', display: 'inline-flex', alignItems: 'center' }}>
        <CheckCheck size={15} />
      </span>
    );
  }

  if (status === 2) {
    return (
      <span className="message-status" style={{ color: '#9e9e9e', display: 'inline-flex', alignItems: 'center' }}>
        <CheckCheck size={15} />
      </span>
    );
  }

  if (status === 1) {
    return (
      <span className="message-status" style={{ color: '#9e9e9e', display: 'inline-flex', alignItems: 'center' }}>
        <Check size={15} />
      </span>
    );
  }

  return null;
}

/* Fixed-height audio player for voice notes & audio files */
function AudioPlayer({
  src,
  messageId,
  loadedMedia,
  setLoadedMedia,
  audioRef,
  isPlaying,
  setIsPlaying,
  progress,
  setProgress,
  duration,
  setDuration,
}) {
  const formatTime = (s) => {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (audioRef.current.paused) {
      audioRef.current.play();
    } else {
      audioRef.current.pause();
    }
  };

  const handleSeek = (e) => {
    if (!audioRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audioRef.current.currentTime = pct * duration;
  };

  return (
    <div className="message-audio-player">
      <button className="message-audio-play-btn" onClick={togglePlay}>
        {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
      </button>
      <div className="message-audio-track" onClick={handleSeek}>
        <div className="message-audio-progress" style={{ width: `${duration ? (progress / duration) * 100 : 0}%` }} />
      </div>
      <span className="message-audio-time">
        {isPlaying || progress > 0 ? formatTime(progress) : formatTime(duration)}
      </span>
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={() => {
          if (audioRef.current) {
            setDuration(audioRef.current.duration || 0);
          }
          setLoadedMedia((prev) => ({ ...prev, [messageId]: true }));
        }}
        onTimeUpdate={() => {
          if (audioRef.current) {
            setProgress(audioRef.current.currentTime || 0);
          }
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          setProgress(0);
        }}
        onError={() => setLoadedMedia((prev) => ({ ...prev, [messageId]: true }))}
      />
    </div>
  );
}

/* Link preview micro-card for text messages containing URLs */
function LinkPreview({ url }) {
  let domain = '';
  try {
    domain = new URL(url).hostname.replace(/^www\./, '');
  } catch (e) {
    domain = url;
  }

  return (
    <a
      className="message-link-preview"
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="message-link-preview-domain">
        <span className="message-link-preview-favicon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
        </span>
        {domain}
      </div>
      <div className="message-link-preview-url">{url.length > 60 ? `${url.slice(0, 60)}...` : url}</div>
    </a>
  );
}

export default MessageBubble;
