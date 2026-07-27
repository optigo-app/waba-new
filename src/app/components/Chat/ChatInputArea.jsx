'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { IconButton, CircularProgress, Tooltip } from '@mui/material';
import { Paperclip, Smile, Send, Image, Video, FileText, Headphones } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import ReplyPreview from './ReplyPreview';

const ATTACH_MENU_ITEMS = [
  { icon: Image, label: 'Image', accept: 'image/*', color: '#8b5cf6', bg: '#f3f0ff' },
  { icon: Video, label: 'Video', accept: 'video/*', color: '#06b6d4', bg: '#ecfeff' },
  { icon: FileText, label: 'Document', accept: 'application/pdf,.doc,.docx,.txt,.ppt,.pptx,.xls,.xlsx', color: '#f59e0b', bg: '#fffbeb' },
  // { icon: Headphones, label: 'Audio', accept: 'audio/*,.aac,.amr,.mp3,.m4a,.ogg', color: '#10b981', bg: '#ecfdf5' },
];

export default function ChatInputArea({
  replyToMessage,
  setReplyToMessage,
  fileInputRef,
  uploading,
  handleFileUpload,
  input,
  setInput,
  handleSend,
  sending,
  mediaPreviewLength,
  emojiPickerOpen,
  setEmojiPickerOpen,
  emojiPickerRef,
  addMediaFiles,
}) {
  const textareaRef = useRef(null);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const attachMenuRef = useRef(null);

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [input, adjustHeight]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Close attachment menu on click outside
  useEffect(() => {
    if (!attachMenuOpen) return;
    const handleClickOutside = (e) => {
      if (attachMenuRef.current && !attachMenuRef.current.contains(e.target)) {
        setAttachMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [attachMenuOpen]);

  const handleMenuItemClick = (accept) => {
    setAttachMenuOpen(false);
    if (fileInputRef.current) {
      fileInputRef.current.setAttribute('accept', accept);
      fileInputRef.current.click();
    }
  };

  return (
    <div className="chat-input-area">
        {/* Reply-to preview */}
        {replyToMessage && (
          <ReplyPreview
            message={replyToMessage}
            onCancel={() => setReplyToMessage(null)}
          />
        )}

        <div className="chat-input-container">
          <div style={{ position: 'relative' }} ref={attachMenuRef}>
            <Tooltip title="Attach file">
              <IconButton
                size="small"
                className="chat-attach-btn"
                onClick={() => setAttachMenuOpen((prev) => !prev)}
                disabled={uploading}
              >
                {uploading ? <CircularProgress size={18} /> : <Paperclip size={18} />}
              </IconButton>
            </Tooltip>

            {attachMenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 'calc(100% + 10px)',
                  left: 0,
                  background: '#fff',
                  borderRadius: 16,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)',
                  padding: '10px 6px',
                  minWidth: 180,
                  zIndex: 100,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                  animation: 'attachMenuIn 0.2s ease',
                }}
              >
                <style>{`
                  @keyframes attachMenuIn {
                    from { opacity: 0; transform: translateY(8px) scale(0.96); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                  }
                `}</style>
                {ATTACH_MENU_ITEMS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.label}
                      onClick={() => handleMenuItemClick(item.accept)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '10px 14px',
                        borderRadius: 12,
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        transition: 'background 0.15s ease',
                        fontFamily: 'var(--font-poppins), Poppins, sans-serif',
                        fontSize: '0.88rem',
                        color: '#1f2937',
                        textAlign: 'left',
                        width: '100%',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = item.bg; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <span
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: '50%',
                          background: item.bg,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Icon size={18} color={item.color} strokeWidth={2} />
                      </span>
                      <span style={{ fontWeight: 500 }}>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <textarea
            ref={textareaRef}
            className="chat-text-input"
            rows={1}
            placeholder={
              replyToMessage
                ? 'Type a reply...'
                : mediaPreviewLength > 0
                ? 'Add a caption...'
                : 'Type a message...'
            }
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              adjustHeight();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            onPaste={(e) => {
              const clipboardData = e.clipboardData || window.clipboardData;
              const files = clipboardData?.files;
              if (files && files.length > 0) {
                e.preventDefault();
                addMediaFiles(files);
              }
            }}
          />
          <div style={{ position: 'relative' }} ref={emojiPickerRef}>
            <Tooltip title="Emoji">
              <IconButton
                size="small"
                className="chat-emoji-btn"
                onClick={() => setEmojiPickerOpen((prev) => !prev)}
              >
                <Smile size={20} />
              </IconButton>
            </Tooltip>
            {emojiPickerOpen && (
              <div className="emoji-picker-dropdown">
                <EmojiPicker
                  onEmojiClick={(emojiData) => {
                    setInput((prev) => prev + emojiData.emoji);
                  }}
                  width={300}
                  height={380}
                  skinTonesDisabled
                />
              </div>
            )}
          </div>
          <button
            className="chat-send-btn"
            onClick={handleSend}
            disabled={sending || (!input.trim() && mediaPreviewLength === 0)}
          >
            {sending ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : <Send size={18} />}
          </button>
        </div>
    </div>
  );
}
