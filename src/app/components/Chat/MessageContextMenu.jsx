'use client';

import { Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import { Reply, Forward, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';

export default function MessageContextMenu({
  open,
  onClose,
  onReply,
  onForward,
  message,
  mouseX,
  mouseY,
  hideReplyForward = false,
}) {
  const can = useAuthStore((s) => s.can);
  const handleReply = () => {
    onReply?.(message);
    onClose?.();
  };

  const handleForward = () => {
    onForward?.(message);
    onClose?.();
  };

  const handleCopy = () => {
    const text = message?.Message || message?.content || message?.text || '';
    if (text) {
      navigator.clipboard.writeText(text).then(() => toast.success('Copied to clipboard'));
    }
    onClose?.();
  };

  return (
    <Menu
      open={open}
      onClose={onClose}
      anchorReference="anchorPosition"
      anchorPosition={open ? { top: mouseY, left: mouseX } : undefined}
      slotProps={{
        paper: {
          elevation: 0,
          sx: {
            width: 200,
            borderRadius: 2.5,
            bgcolor: 'rgba(255, 255, 255, 0.96)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(0,0,0,0.08)',
            boxShadow: '0 16px 40px rgba(0,0,0,0.12)',
            overflow: 'hidden',
            '& .MuiList-root': { py: 0.75 },
          },
        },
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        onClose?.();
      }}
    >
      {!hideReplyForward && can(6) && (
        <MenuItem
          onClick={handleReply}
          sx={{ mx: 0.75, my: 0.25, borderRadius: 2, py: 1 }}
        >
          <ListItemIcon sx={{ minWidth: 34 }}>
            <Reply size={18} />
          </ListItemIcon>
          <ListItemText primary="Reply" sx={{ '& .MuiTypography-root': { fontSize: 14, fontWeight: 500 } }} />
        </MenuItem>
      )}

      {!hideReplyForward && can(6) && (
        <MenuItem
          onClick={handleForward}
          sx={{ mx: 0.75, my: 0.25, borderRadius: 2, py: 1 }}
        >
          <ListItemIcon sx={{ minWidth: 34 }}>
            <Forward size={18} />
          </ListItemIcon>
          <ListItemText primary="Forward" sx={{ '& .MuiTypography-root': { fontSize: 14, fontWeight: 500 } }} />
        </MenuItem>
      )}

      <MenuItem
        onClick={handleCopy}
        sx={{ mx: 0.75, my: 0.25, borderRadius: 2, py: 1 }}
      >
        <ListItemIcon sx={{ minWidth: 34 }}>
          <Copy size={18} />
        </ListItemIcon>
        <ListItemText primary="Copy" sx={{ '& .MuiTypography-root': { fontSize: 14, fontWeight: 500 } }} />
      </MenuItem>
    </Menu>
  );
}
