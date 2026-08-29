'use client';

import { useCallback, useEffect, useRef } from 'react';
import { CircularProgress } from '@mui/material';
import { Paperclip, ArrowDown, MessageCircle } from 'lucide-react';
import { formatDateHeader } from './utils/dateUtils';
import MessageBubble from './MessageBubble';
import MediaPreviewOverlay from './MediaPreviewOverlay';


export default function ChatMessagesArea({
  conversationId,
  messages,
  loading,
  hasFetched,
  isDragOver,
  containerRef,
  messagesListRef,
  handleDragEnter,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  mediaPreview,
  selectedPreviewIndex,
  setSelectedPreviewIndex,
  isSendingMedia,
  clearMediaPreview,
  removeMediaPreview,
  fileInputRef,
  showScrollToBottom,
  setShowScrollToBottom,
  unreadCount,
  setUnreadCount,
  scrollToBottom,
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
  input,
  setInput,
  handleSend,
  sending,
  emojiPickerOpen,
  setEmojiPickerOpen,
  isLoadingMore,
  hasMore,
  loadMoreMessages,
}) {
  const sentinelRef = useRef(null);

  // IntersectionObserver-based infinite scroll — more reliable than scroll event in column-reverse
  useEffect(() => {
    const sentinel = sentinelRef.current;
    const container = messagesListRef.current;
    if (!sentinel || !container) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore && !loading) {
          loadMoreMessages();
        }
      },
      { root: container, rootMargin: '300px 0px 0px 0px', threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, loading, loadMoreMessages, conversationId, messages.length]);

  const groupMessagesByDate = useCallback(() => {
    const grouped = {};
    messages.forEach((msg) => {
      let date;
      const rawDate = msg?.DateTime || msg?.sentAt || msg?.sent_at || msg?.createdAt;
      if (rawDate) {
        const d = new Date(rawDate);
        date = d.toISOString().split('T')[0];
      } else {
        date = 'Unknown';
      }
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(msg);
    });
    return grouped;
  }, [messages]);

  return (
    <div
      className={`chat-messages-area ${isDragOver ? 'drag-over' : ''} ${mediaPreview.length > 0 ? 'media-preview-open' : ''}`}
      ref={containerRef}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragOver && (
        <div className="drag-overlay">
          <div className="drag-overlay-content">
            <Paperclip size={40} />
            <span>Drop files here to send</span>
          </div>
        </div>
      )}

      <div
        className="chat-messages-list fade-in"
        key={conversationId}
        ref={messagesListRef}
      >
        {/* Blur overlay + CircularProgress while loading initial conversation */}
        {loading && messages.length === 0 && (
          <div className="chat-messages-loading-overlay">
            <div className="chat-messages-loading-blur" />
            <div className="chat-messages-loading-content">
              <CircularProgress size={40} thickness={3.5} sx={{ color: 'var(--chat-primary, #25d366)' }} />
              <span className="chat-messages-loading-text">Loading conversation...</span>
            </div>
          </div>
        )}

        {!loading && messages.length === 0 && hasFetched && (
          <div className="chat-empty-center">
            <div className="chat-empty-icon">
              <MessageCircle size={48} strokeWidth={1.5} />
            </div>
            <div className="chat-empty-title">No messages yet</div>
            <div className="chat-empty-subtitle">Start the conversation below</div>
          </div>
        )}

        {Object.entries(groupMessagesByDate()).reverse().map(([date, dateMessages]) => (
          <div key={`group-${date}`}>
            {dateMessages.some((m) => m?.DateTime || m?.sentAt || m?.sent_at) && (
              <div className="message-date-header" key={`header-${date}`}>
                <span>{formatDateHeader(date)}</span>
              </div>
            )}
            {dateMessages.map((msg) => {
              const isOutgoing = msg?.direction === 1 || msg?.Direction === 1 || msg?.direction === '1';
              const messageId = msg?.id || msg?.Id || msg?.autoid || msg?.MessageId;
              return (
                <MessageBubble
                  key={messageId}
                  msg={msg}
                  messageId={messageId}
                  isOutgoing={isOutgoing}
                  baseAvatarConfig={baseAvatarConfig}
                  messageReactions={messageReactions}
                  loadedMedia={loadedMedia}
                  setLoadedMedia={setLoadedMedia}
                  mediaCache={mediaCache}
                  requestMediaFetch={requestMediaFetch}
                  setMediaViewer={setMediaViewer}
                  reactionPickerMessageId={reactionPickerMessageId}
                  setReactionPickerMessageId={setReactionPickerMessageId}
                  onContextMenuOpen={onContextMenuOpen}
                  onReactionSelect={onReactionSelect}
                  onExternalLinkClick={onExternalLinkClick}
                  blinkMessageId={blinkMessageId}
                  scrollToMessage={scrollToMessage}
                />
              );
            })}
          </div>
        ))}

        {/* Sentinel for IntersectionObserver — placed last in DOM so it appears at visual top in column-reverse */}
        {hasMore && !loading && (
          <div ref={sentinelRef} style={{ height: 1, width: '100%', flexShrink: 0 }} />
        )}

        {/* Loading indicator at visual top (last in DOM = top in column-reverse) */}
        {isLoadingMore && (
          <div className="chat-messages-loading-more" style={{ padding: '8px 0', display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
            <CircularProgress size={18} thickness={4} sx={{ color: 'var(--primary-main)' }} />
            <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Loading older messages...</span>
          </div>
        )}
      </div>

      {/* Scroll to bottom button */}
      {showScrollToBottom && messages.length > 0 && (
        <button
          className="scroll-to-bottom-btn"
          onClick={() => {
            scrollToBottom();
            setUnreadCount(0);
          }}
          aria-label="Scroll to bottom"
        >
          <ArrowDown size={20} strokeWidth={2.5} />
          {unreadCount > 0 && (
            <span className="scroll-to-bottom-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
          )}
        </button>
      )}

      {/* WhatsApp-style media preview overlay */}
      {mediaPreview.length > 0 && (
        <MediaPreviewOverlay
          mediaPreview={mediaPreview}
          messages={messages}
          selectedPreviewIndex={selectedPreviewIndex}
          onSelectIndex={setSelectedPreviewIndex}
          isSendingMedia={isSendingMedia}
          onClear={clearMediaPreview}
          onRemove={removeMediaPreview}
          onAddMore={() => fileInputRef.current?.click()}
          input={input}
          setInput={setInput}
          handleSend={handleSend}
          sending={sending}
          emojiPickerOpen={emojiPickerOpen}
          setEmojiPickerOpen={setEmojiPickerOpen}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        />
      )}
    </div>
  );
}
