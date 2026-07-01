'use client';

import { useState, useCallback } from 'react';
import {
  Box, Avatar, Select, MenuItem, FormControl, AvatarGroup, Tooltip,
  Dialog, DialogTitle, DialogContent, List, ListItem, ListItemAvatar, ListItemText, IconButton,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useMediaQuery } from '@mui/material';
import { Check, ArrowUpCircle, X, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { addAssignUser, removeAssignUser } from '../../api/chat/conversationApi';
import { getWhatsAppAvatarConfig } from './utils/chatUtils';
import { useAuth } from '../../hooks/useAuth';

const getUserAvatar = (user, size = 32) => {
  const seed = String(user?.FullName ?? user?.FirstName ?? user?.UserId ?? '').trim();
  return getWhatsAppAvatarConfig(seed || 'user', size);
};

const isUserEscalated = (option, conversationId) => {
  const conversationIds = option?.ConversationIds
    ? (typeof option.ConversationIds === 'string' ? JSON.parse(option.ConversationIds) : option.ConversationIds)
    : [];
  return conversationIds.some(
    (item) => item.ConversationId === conversationId && item.UserId === option.UserId
  );
};

export default function EscalatedDropdown({
  options = [],
  selectedCustomer,
  onRefresh,
}) {
  const theme = useTheme();
  const isCompact = useMediaQuery('(max-width:1024px)');
  const { auth } = useAuth();
  const [selectOpen, setSelectOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const conversationId = selectedCustomer?.ConversationId;

  const handleEscalate = useCallback(async (userId) => {
    if (!conversationId) return;
    try {
      const response = await addAssignUser(conversationId, userId, auth?.userId);
      if (response) {
        toast.success('User escalated successfully');
        onRefresh?.();
      }
    } catch (err) {
      toast.error('Failed to escalate user');
    }
  }, [conversationId, auth?.userId, onRefresh]);

  const handleUnEscalate = useCallback(async (userId) => {
    if (!conversationId) return;
    try {
      const response = await removeAssignUser(conversationId, userId, auth?.userId);
      if (response) {
        toast.success('User unescalated successfully');
        onRefresh?.();
      }
    } catch (err) {
      toast.error('Failed to unescalate user');
    }
  }, [conversationId, auth?.userId, onRefresh]);

  const escalatedUsers = options.filter((opt) => isUserEscalated(opt, conversationId));
  const visibleEscalated = escalatedUsers.slice(0, 2);
  const overflowEscalated = escalatedUsers.slice(2);

  if (!options.length) return null;

  return (
    <Box sx={{ display: 'flex', gap: 0.5, minWidth: isCompact ? 0 : 140, alignItems: 'center' }}>
      <Box
        sx={{ mb: 0.5, cursor: isCompact ? 'pointer' : 'default' }}
        onClick={isCompact ? () => setDialogOpen(true) : undefined}
      >
        <AvatarGroup max={3} sx={{ '& .MuiAvatar-root': { width: 28, height: 28, fontSize: 12 } }}>
          {visibleEscalated.map((user) => {
            const cfg = getUserAvatar(user, 28);
            return (
              <Tooltip key={user.UserId} title={user?.FullName || user?.FirstName || 'User'} arrow>
                <Avatar {...cfg} sx={{ ...cfg.sx, width: 28, height: 28, fontSize: 11 }} />
              </Tooltip>
            );
          })}
          {overflowEscalated.length > 0 && (
            <Tooltip
              title={overflowEscalated.map((u) => u?.FullName || u?.FirstName || 'User').join(', ')}
              arrow
            >
              <Avatar
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectOpen((prev) => !prev);
                }}
                sx={{
                  width: 28, height: 28, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                  bgcolor: alpha(theme.palette.primary.main, 0.16),
                  color: theme.palette.primary.main,
                }}
              >
                +{overflowEscalated.length}
              </Avatar>
            </Tooltip>
          )}
          {isCompact && escalatedUsers.length === 0 && (
            <Tooltip title="Escalate" arrow>
              <Avatar
                onClick={(e) => {
                  e.stopPropagation();
                  setDialogOpen(true);
                }}
                sx={{
                  width: 26, height: 26, cursor: 'pointer',
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  color: theme.palette.primary.main,
                }}
              >
                <ArrowUpCircle size={14} />
              </Avatar>
            </Tooltip>
          )}
        </AvatarGroup>
      </Box>

      <FormControl
        fullWidth
        size="small"
        sx={isCompact ? { position: 'absolute', opacity: 0, width: 0, height: 0, overflow: 'hidden' } : {}}
      >
        <Select
          open={selectOpen}
          onOpen={() => setSelectOpen(true)}
          onClose={() => setSelectOpen(false)}
          value=""
          displayEmpty
          renderValue={() => 'Escalate'}
          sx={{
            borderRadius: 2, fontSize: 13,
            '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(0,0,0,0.08)' },
            '& .MuiSelect-select': { py: '5px', px: 1.5 },
          }}
          MenuProps={{ slotProps: { paper: { sx: { border: '1px solid rgba(0,0,0,0.08)', borderRadius: 2 } } } }}
        >
          {options.map((option) => {
            const escalated = isUserEscalated(option, conversationId);
            const cfg = getUserAvatar(option, 28);
            return (
              <MenuItem
                key={option.UserId}
                value={option.UserId}
                onClick={() => (escalated ? handleUnEscalate(option.UserId) : handleEscalate(option.UserId))}
                sx={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  backgroundColor: escalated ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
                  '&:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.15) },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Avatar {...cfg} sx={{ ...cfg.sx, width: 24, height: 24, fontSize: 11 }} />
                  <span style={{ fontSize: 13 }}>{option.FullName || option.FirstName || 'User'}</span>
                </Box>
                {escalated && <Check size={18} style={{ color: theme.palette.primary.main }} />}
              </MenuItem>
            );
          })}
        </Select>
      </FormControl>

      {/* Mobile member dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1.5, fontSize: '1rem' }}>
          Escalate Members
          <IconButton size="small" onClick={() => setDialogOpen(false)}>
            <X size={18} />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 0, pb: 1 }}>
          <List dense>
            {options.map((option) => {
              const escalated = isUserEscalated(option, conversationId);
              const cfg = getUserAvatar(option, 24);
              return (
                <ListItem
                  key={option.UserId}
                  onClick={() => {
                    if (escalated) {
                      handleUnEscalate(option.UserId);
                    } else {
                      handleEscalate(option.UserId);
                    }
                  }}
                  sx={{
                    cursor: 'pointer',
                    borderRadius: 1,
                    mb: 0.5,
                    bgcolor: escalated ? alpha(theme.palette.primary.main, 0.08) : 'transparent',
                    '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.12) },
                  }}
                >
                  <ListItemAvatar sx={{ minWidth: 36 }}>
                    <Avatar {...cfg} sx={{ ...cfg.sx, width: 22, height: 22, fontSize: 10 }} />
                  </ListItemAvatar>
                  <ListItemText
                    primary={option.FullName || option.FirstName || 'User'}
                    primaryTypographyProps={{ fontSize: 13 }}
                  />
                  {escalated ? (
                    <Check size={16} style={{ color: theme.palette.primary.main }} />
                  ) : (
                    <Plus size={16} style={{ color: '#9ca3af' }} />
                  )}
                </ListItem>
              );
            })}
          </List>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
