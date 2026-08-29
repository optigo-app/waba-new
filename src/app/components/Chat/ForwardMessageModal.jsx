'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Avatar, Box, Button, TextField, Typography,
  MenuList, MenuItem, ListItemAvatar, ListItemText, Checkbox, Chip,
} from '@mui/material';
import { Search, User, Send, Check, X, UsersRound } from 'lucide-react';
import { getCustomerDisplayName, getCustomerAvatarSeed, getWhatsAppAvatarConfig, hasCustomerName } from './utils/chatUtils';
import { fetchConversationLists } from '../../api/chat/conversationApi';
import { useAuth } from '../../hooks/useAuth';
import CustomerModal from './ui/CustomerModal';
import toast from 'react-hot-toast';

// Custom debounce hook
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
};

const getContactId = (contact) => contact?.CustomerId || contact?.Id || contact?.id;

// Returns { title, subtitle } — falls back to phone number as the title and
// an "Unsaved Contact" label instead of duplicating the phone on both lines.
const getContactIdentity = (contact) => {
  const phone = contact?.CustomerPhone || contact?.Sender || '';
  if (hasCustomerName(contact)) {
    const name = getCustomerDisplayName(contact);
    return { title: name, subtitle: phone && phone !== name ? phone : undefined };
  }
  return { title: phone || getCustomerDisplayName(contact), subtitle: 'Unsaved Contact' };
};

export default function ForwardMessageModal({ message, onSend, onClose }) {
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 400);
  const [loading, setLoading] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const { auth } = useAuth();

  const loadContacts = useCallback(async () => {
    if (!auth?.userId) return;
    setLoading(true);
    try {
      const response = await fetchConversationLists(1, 500, auth.userId, debouncedSearchTerm);
      const list = response?.data?.rd || response?.data || [];
      setContacts(list);
    } catch (error) {
      console.error('Error loading contacts:', error);
      setContacts([]);
    } finally {
      setLoading(false);
    }
  }, [auth?.userId, debouncedSearchTerm]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  useEffect(() => {
    if (activeTab === 'selected' && selectedContacts.length === 0) {
      setActiveTab('all');
    }
  }, [activeTab, selectedContacts.length]);

  const filteredContacts = useMemo(() => {
    if (!searchTerm.trim()) return contacts;
    const term = searchTerm.toLowerCase();
    return contacts.filter((c) => {
      const name = getCustomerDisplayName(c)?.toLowerCase() || '';
      const phone = (c.CustomerPhone || c.Sender || '').toLowerCase();
      return name.includes(term) || phone.includes(term);
    });
  }, [contacts, searchTerm]);

  // "All" tab shows the fetched/searched contacts; "Selected" tab lets the user review picks
  const displayedContacts = activeTab === 'selected' ? selectedContacts : filteredContacts;

  const handleContactSelect = (contact) => {
    setSelectedContacts((prev) => {
      const cid = getContactId(contact);
      const isSelected = prev.find((c) => getContactId(c) === cid);
      return isSelected ? prev.filter((c) => getContactId(c) !== cid) : [...prev, contact];
    });
  };

  const handleRemoveContact = (contact) => {
    const cid = getContactId(contact);
    setSelectedContacts((prev) => prev.filter((c) => getContactId(c) !== cid));
  };

  const allDisplayedSelected = useMemo(() => {
    if (displayedContacts.length === 0) return false;
    return displayedContacts.every((contact) => {
      const cid = getContactId(contact);
      return selectedContacts.some((c) => getContactId(c) === cid);
    });
  }, [displayedContacts, selectedContacts]);

  const handleToggleSelectAll = () => {
    if (allDisplayedSelected) {
      const displayedIds = displayedContacts.map(getContactId);
      setSelectedContacts((prev) => prev.filter((c) => !displayedIds.includes(getContactId(c))));
    } else {
      setSelectedContacts((prev) => {
        const next = [...prev];
        displayedContacts.forEach((contact) => {
          const cid = getContactId(contact);
          if (!next.some((c) => getContactId(c) === cid)) {
            next.push(contact);
          }
        });
        return next;
      });
    }
  };

  const handleSend = () => {
    if (selectedContacts.length === 0) {
      toast.error('Please select at least one contact');
      return;
    }
    onSend?.(selectedContacts);
    onClose?.();
  };

  const selectedCount = selectedContacts.length;

  return (
    <CustomerModal
      open={true}
      onClose={onClose}
      title="Forward to..."
      subtitle="Share message with contacts"
      maxWidth="xs"
      dialogContentSx={{ p: 0, '&:first-of-type': { pt: 0 } }}
      contentSx={{ p: 0, pt: 0, fontFamily: 'var(--chat-font)' }}
      paperSx={{ borderRadius: 4 }}
      actions={
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography
              variant="caption"
              sx={{
                fontFamily: 'var(--chat-font)',
                fontWeight: 500,
                fontSize: '0.78rem',
                color: selectedCount > 0 ? 'var(--chat-primary, #25d366)' : 'var(--text-secondary)',
              }}
            >
              {selectedCount > 0 ? `${selectedCount} contact${selectedCount > 1 ? 's' : ''} selected` : 'No contacts selected'}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 1.25 }}>
            <Button
              onClick={onClose}
              variant="text"
              size="medium"
              sx={{
                textTransform: 'none',
                borderRadius: '10px',
                px: 2,
                fontFamily: 'var(--chat-font)',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                '&:hover': {
                  backgroundColor: 'var(--bg-default)',
                },
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={selectedContacts.length === 0}
              variant="contained"
              size="medium"
              startIcon={<Send size={15} />}
              sx={{
                textTransform: 'none',
                borderRadius: '10px',
                px: 2.5,
                fontFamily: 'var(--chat-font)',
                fontWeight: 600,
                boxShadow: 'none',
                backgroundColor: 'var(--chat-btn-bg, #1daa61)',
                '&:hover': { backgroundColor: 'var(--chat-btn-hover-color, #128c7e)', boxShadow: 'none' },
                '&:disabled': { backgroundColor: 'var(--border-color)', color: 'var(--text-tertiary)' },
              }}
            >
              Send
            </Button>
          </Box>
        </Box>
      }
    >
      {/* Search — edge-to-edge, no nested card */}
      <Box sx={{ px: 2.5, py: 1.5, borderBottom: '1px solid var(--border-color)' }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search contacts..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <Search size={16} style={{ color: 'var(--text-secondary)', marginRight: 8, flexShrink: 0 }} />
              ),
              endAdornment: searchTerm ? (
                <Box
                  component="button"
                  type="button"
                  onClick={() => setSearchTerm('')}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-tertiary)',
                    p: 0.25,
                    '&:hover': { color: 'var(--text-primary)' },
                  }}
                >
                  <X size={14} />
                </Box>
              ) : null,
            },
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: '10px',
              fontSize: '0.85rem',
              backgroundColor: 'var(--bg-default)',
              fontFamily: 'var(--chat-font)',
              color: 'var(--text-primary)',
              '& fieldset': { border: 'none' },
              '&.Mui-focused': {
                backgroundColor: 'var(--bg-paper)',
                boxShadow: '0 0 0 1.5px var(--chat-primary, #25d366)',
              },
              '& input::placeholder': {
                color: 'var(--text-secondary)',
                opacity: 1,
              },
            },
          }}
        />
      </Box>

      {/* Filter tabs + Select all — single edge-to-edge bar */}
      <Box
        sx={{
          px: 2.5,
          py: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
          borderBottom: '1px solid var(--border-color)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          {[
            { key: 'all', label: 'All', count: contacts.length },
            { key: 'selected', label: 'Selected', count: selectedCount },
          ].map((tab) => {
            if (tab.key === 'selected' && selectedCount === 0) return null;
            const active = activeTab === tab.key;
            return (
              <Box
                key={tab.key}
                component="button"
                type="button"
                onClick={() => setActiveTab(tab.key)}
                sx={{
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: '20px',
                  px: 1.4,
                  py: 0.4,
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  fontFamily: 'var(--chat-font)',
                  transition: 'all 0.15s ease',
                  backgroundColor: active ? 'var(--chat-primary, #25d366)' : 'var(--bg-default)',
                  color: active ? '#fff' : 'var(--text-secondary)',
                }}
              >
                {tab.label} {tab.count > 0 ? `(${tab.count})` : ''}
              </Box>
            );
          })}
        </Box>

        {displayedContacts.length > 0 && (
          <Box
            onClick={handleToggleSelectAll}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            <Typography
              variant="caption"
              sx={{ fontFamily: 'var(--chat-font)', fontWeight: 600, fontSize: '0.72rem', color: 'var(--text-secondary)' }}
            >
              {allDisplayedSelected ? 'Deselect all' : 'Select all'}
            </Typography>
            <Checkbox
              size="small"
              checked={allDisplayedSelected}
              onChange={handleToggleSelectAll}
              onClick={(e) => e.stopPropagation()}
              sx={{
                color: 'var(--text-tertiary)',
                '&.Mui-checked': { color: 'var(--chat-primary, #25d366)' },
                p: 0.5,
              }}
            />
          </Box>
        )}
      </Box>

      {/* Selected contacts chips — max 3 visible + "+N more" */}
      {selectedContacts.length > 0 && (
        <Box
          sx={{
            px: 2.5,
            py: 1.1,
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          {selectedContacts.slice(0, 3).map((contact) => {
            const { title } = getContactIdentity(contact);
            return (
              <Chip
                key={getContactId(contact)}
                avatar={(
                  <Avatar {...getWhatsAppAvatarConfig(getCustomerAvatarSeed(contact), 20)}>
                    <User size={11} />
                  </Avatar>
                )}
                label={title?.split(' ')[0]}
                onDelete={() => handleRemoveContact(contact)}
                size="small"
                sx={{
                  height: 26,
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  borderRadius: '20px',
                  backgroundColor: 'var(--chat-primary-light, rgba(37, 211, 102, 0.14))',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--chat-font)',
                  '& .MuiChip-avatar': { width: 20, height: 20 },
                  '& .MuiChip-deleteIcon': { color: 'var(--text-secondary)', fontSize: '15px', '&:hover': { color: 'error.main' } },
                }}
              />
            );
          })}
          {selectedCount > 3 && (
            <Box
              component="button"
              type="button"
              onClick={() => setActiveTab('selected')}
              sx={{
                border: 'none',
                cursor: 'pointer',
                borderRadius: '20px',
                height: 26,
                px: 1.2,
                fontSize: '0.72rem',
                fontWeight: 700,
                fontFamily: 'var(--chat-font)',
                backgroundColor: 'var(--chat-primary, #25d366)',
                color: '#fff',
              }}
            >
              +{selectedCount - 3} more
            </Box>
          )}
        </Box>
      )}

      {/* Contact list — flat rows, edge-to-edge dividers, ultra-thin scrollbar */}
      <Box
        sx={{
          maxHeight: 300,
          minHeight: 180,
          overflowY: 'auto',
          '&::-webkit-scrollbar': { width: '5px' },
          '&::-webkit-scrollbar-track': { background: 'transparent' },
          '&::-webkit-scrollbar-thumb': { backgroundColor: 'transparent', borderRadius: '10px' },
          '&:hover::-webkit-scrollbar-thumb': { backgroundColor: 'var(--text-tertiary)', opacity: 0.4 },
        }}
      >
        <MenuList dense sx={{ py: 0 }}>
          {loading && displayedContacts.length === 0 && (
            <MenuItem disabled sx={{ py: 1.5, px: 2.5 }}>
              <ListItemText
                primary="Loading contacts..."
                slotProps={{ primary: { sx: { fontSize: '0.85rem', color: 'text.secondary', fontFamily: 'var(--chat-font)' } } }}
              />
            </MenuItem>
          )}
          {!loading && displayedContacts.length === 0 && (
            <Box sx={{ py: 5, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, color: 'var(--text-tertiary)' }}>
              <UsersRound size={30} strokeWidth={1.5} style={{ opacity: 0.6 }} />
              <Typography
                variant="body2"
                sx={{ fontSize: '0.82rem', fontWeight: 500, fontFamily: 'var(--chat-font)', color: 'var(--text-secondary)' }}
              >
                No contacts found
              </Typography>
            </Box>
          )}
          {displayedContacts.map((contact, index) => {
            const cid = getContactId(contact);
            const isSelected = !!selectedContacts.find((c) => getContactId(c) === cid);
            const { title, subtitle } = getContactIdentity(contact);
            return (
              <MenuItem
                key={cid}
                divider={index < displayedContacts.length - 1}
                onClick={() => handleContactSelect(contact)}
                sx={{
                  py: 1.1,
                  px: 2.5,
                  backgroundColor: isSelected ? 'var(--chat-primary-light, rgba(37, 211, 102, 0.06))' : 'transparent',
                  borderBottomColor: 'var(--border-color)',
                  '&:hover': { backgroundColor: isSelected ? 'var(--chat-primary-light, rgba(37, 211, 102, 0.1))' : 'action.hover' },
                }}
              >
                <ListItemAvatar sx={{ minWidth: 44 }}>
                  <Avatar
                    sx={{ width: 36, height: 36 }}
                    {...getWhatsAppAvatarConfig(getCustomerAvatarSeed(contact), 36)}
                  >
                    <User size={16} />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={title}
                  secondary={subtitle}
                  slotProps={{
                    primary: { sx: { fontSize: '0.875rem', fontWeight: 600, color: 'text.primary', fontFamily: 'var(--chat-font)' } },
                    secondary: {
                      sx: {
                        fontSize: '0.72rem',
                        fontFamily: 'var(--chat-font)',
                        color: subtitle === 'Unsaved Contact' ? 'var(--text-tertiary)' : 'var(--text-secondary)',
                        fontStyle: subtitle === 'Unsaved Contact' ? 'italic' : 'normal',
                      },
                    },
                  }}
                />
                <Box
                  sx={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: isSelected ? 'none' : '1.5px solid var(--border-strong, var(--border-color))',
                    backgroundColor: isSelected ? 'var(--chat-primary, #25d366)' : 'transparent',
                    color: '#fff',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {isSelected && <Check size={13} strokeWidth={3} />}
                </Box>
              </MenuItem>
            );
          })}
        </MenuList>
      </Box>
    </CustomerModal>
  );
}
