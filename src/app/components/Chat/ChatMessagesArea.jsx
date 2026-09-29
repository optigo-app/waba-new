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
  const wasIntersectingRef = useRef(false);

  // IntersectionObserver-based infinite scroll — more reliable than scroll event in column-reverse.
  // Trigger only when the sentinel transitions from not-intersecting to intersecting,
  // so prepending older messages doesn't cause an automatic chain of page loads.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    const container = messagesListRef.current;
    if (!sentinel || !container) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const isIntersecting = entries[0]?.isIntersecting ?? false;
        const shouldLoad =
          isIntersecting &&
          hasMore &&
          !isLoadingMore &&
          !loading &&
          !wasIntersectingRef.current;
        if (shouldLoad) {
          loadMoreMessages();
        }
        wasIntersectingRef.current = isIntersecting;
      },
      { root: container, rootMargin: '300px 0px 0px 0px', threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, loading, loadMoreMessages, conversationId, messages.length, messagesListRef]);

  const groupMessagesByDate = useCallback(() => {
    const getTime = (m) => {
      const raw = m?.DateTime || m?.sentAt || m?.sent_at || m?.createdAt;
      const t = raw ? new Date(raw).getTime() : NaN;
      return Number.isNaN(t) ? -Infinity : t;
    };
    const grouped = {};
    messages.forEach((msg) => {
      const t = getTime(msg);
      const date = t === -Infinity ? 'Unknown' : new Date(t).toISOString().split('T')[0];
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push({ msg, t });
    });
    /* Render order must be chronological regardless of store insertion order.
       Socket echoes / optimistic sends can append an older-dated message at
       the end of the array — in column-reverse that group's DOM position would
       pin it to the visual bottom until a refresh re-sorts the list. So sort
       groups newest-first (first DOM child = visual bottom) and messages
       within each group oldest-first. 'Unknown' goes last (visual top). */
    return Object.entries(grouped)
      .sort(([a], [b]) => {
        if (a === 'Unknown') return 1;
        if (b === 'Unknown') return -1;
        return a < b ? 1 : a > b ? -1 : 0;
      })
      .map(([date, items]) => [date, items.sort((x, y) => x.t - y.t).map((i) => i.msg)]);
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

        {groupMessagesByDate().map(([date, dateMessages]) => (
          <div key={`group-${date}`}>
            {date !== 'Unknown' && dateMessages.some((m) => m?.DateTime || m?.sentAt || m?.sent_at) && (
              <div className="message-date-header" key={`header-${date}`}>
                <span>{formatDateHeader(date)}</span>
              </div>
            )}
            {dateMessages.map((msg) => {
              const isOutgoing = msg?.direction === 1 || msg?.Direction === 1 || msg?.direction === '1';
              const messageId = msg?.id || msg?.Id || msg?.autoid || msg?.MessageId;
              return (
                <MessageBubble
                  key={msg?.tempId || messageId}
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
          {/* {unreadCount > 0 && (
            <span className="scroll-to-bottom-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
          )} */}
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
