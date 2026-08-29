'use client';

import { memo, useRef } from 'react';
import { Popover } from '@mui/material';
import EmojiPicker from 'emoji-picker-react';
import { SmilePlus } from 'lucide-react';

const QuickReactionMenu = memo(function QuickReactionMenu({
  isOpen,
  onToggle,
  onSelect,
}) {
  const buttonRef = useRef(null);

  return (
    <div className="quick-reaction-menu">
      <button
        ref={buttonRef}
        className="reaction-btn"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        title="React"
      >
        <SmilePlus size={18} />
      </button>

      <Popover
        open={isOpen}
        anchorEl={buttonRef.current}
        onClose={onToggle}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        slotProps={{
          paper: {
            sx: {
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 12px 40px rgba(0,0,0,0.16)',
              border: '1px solid rgba(0,0,0,0.06)',
              mt: -1.5,
              '& .EmojiPickerReact': {
                '--epr-bg-color': 'var(--bg-paper)',
                '--epr-category-label-bg-color': 'var(--bg-paper)',
                '--epr-category-label-text-color': 'var(--text-primary)',
                '--epr-hover-bg-color': 'rgba(37, 211, 102, 0.08)',
                '--epr-focus-bg-color': 'rgba(37, 211, 102, 0.12)',
                '--epr-text-color': 'var(--text-primary)',
                '--epr-search-border-color': 'transparent',
                '--epr-search-input-bg-color': 'var(--bg-light)',
                '--epr-active-category-icon-color': 'var(--chat-primary, #25d366)',
                '--epr-emoji-size': '28px',
                '--epr-emoji-padding': '4px',
                fontFamily: 'inherit',
                border: 'none',
              },
            },
          },
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <EmojiPicker
          onEmojiClick={(emojiData) => onSelect(emojiData.emoji)}
          width={310}
          height={400}
          skinTonesDisabled
          searchPlaceholder="Search emoji..."
        />
      </Popover>
    </div>
  );
});

export default QuickReactionMenu;
