'use client';

import { useState, useEffect, useCallback, useRef, useMemo, useDeferredValue, memo } from 'react';
import { Avatar, Badge, IconButton, Menu, MenuItem, Tooltip, Skeleton, CircularProgress } from '@mui/material';
import {
  Search, Pin, PinOff, Star, StarOff, Archive, ArchiveRestore,
  ChevronDown, UserPlus, X, User as PersonIcon, Tag, Check,
} from 'lucide-react';
import {
  getWhatsAppAvatarConfig, getCustomerDisplayName, getCustomerAvatarSeed,
  hasCustomerName, processApiResponse, getMessageStatusIcon, getMessagePreview,
} from './utils/chatUtils';
import { formatChatTimestamp } from './utils/dateUtils';
import {
  fetchConversationLists,
  fetchAllTags,
  pinConversationApi,
  unPinConversationApi,
  favoriteApi,
  unFavoriteApi,
  archieveApi,
  unArchieveApi,
} from '../../api/chat/conversationApi';
import AddCustomerDialog from './AddCustomerDialog';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';
import toast from 'react-hot-toast';

const TAB_ITEMS = [
  { label: 'All', value: 0 },
  { label: 'Escalated', value: 1 },
  { label: 'favourite', value: 2 },
];

const getMenuItems = (member, can) => {
  const items = [
    {
      action: member?.IsPin === 1 ? 'UnPin' : 'Pin',
      icon: member?.IsPin === 1 ? <PinOff size={18} /> : <Pin size={18} />,
      label: member?.IsPin === 1 ? 'Unpin' : 'Pin',
    },
    {
      action: member?.IsStar === 1 ? 'UnStar' : 'Star',
      icon: member?.IsStar === 1 ? <StarOff size={18} /> : <Star size={18} />,
      label: member?.IsStar === 1 ? 'Unfavourite' : 'favourite',
    },
  ];
  if (can(7)) {
    items.push({
      action: member?.IsArchived === 1 ? 'UnArchive' : 'Archive',
      icon: member?.IsArchived === 1 ? <ArchiveRestore size={18} /> : <Archive size={18} />,
      label: member?.IsArchived === 1 ? 'Unarchive' : 'Archive',
    });
  }
  if (can(16) && member?.CustomerName === '') {
    items.push({
      action: 'AddCustomer',
      icon: <UserPlus size={18} />,
      label: 'Add to Customer',
    });
  }
  return items;
};

const getTagId = (tag) => tag?.TagId ?? tag?.Id ?? tag?.id ?? null;

function ChatSidebar({
  onCustomerSelect,
  selectedCustomer,
  isConversationRead,
  viewConversationRead,
  onConversationList,
  selectedTag,
  onTagSelect,
  onFileDrop,
}) {
  const auth = useAuthStore((s) => s.auth);
  const can = useAuthStore((s) => s.can);
  const userId = auth?.userId || auth?.userid || auth?.appuserid || '';
  const conversations = useChatStore((s) => s.conversations);
  const allConversationsCache = useChatStore((s) => s.allConversationsCache);
  const setConversations = useChatStore.getState().setConversations;
  const setAllConversationsCache = useChatStore.getState().setAllConversationsCache;
  const [loading, setLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [allTags, setAllTags] = useState([]);
  const [tagsLoading, setTagsLoading] = useState(true);
  const [showEmptyAfterDelay, setShowEmptyAfterDelay] = useState(false);
  const [tagSearchTerm, setTagSearchTerm] = useState('');
  const [tagMenuAnchor, setTagMenuAnchor] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [contextMember, setContextMember] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [menuMember, setMenuMember] = useState(null);
  const [addCustomerDialogOpen, setAddCustomerDialogOpen] = useState(false);
  const [addCustomerMember, setAddCustomerMember] = useState(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [dragOverId, setDragOverId] = useState(null);
  const listRef = useRef(null);
  const itemRefs = useRef({});
  const searchInputRef = useRef(null);
  const tagSearchInputRef = useRef(null);
  const tagMenuItemRefs = useRef([]);

  // Single ref for all keyboard-handler state to keep listener stable
  const kbRef = useRef({
    searchTerm: '',
    highlightedIndex: -1,
    filtered: [],
    anchorEl: null,
    contextMenu: null,
    addCustomerDialogOpen: false,
  });

  const loadConversations = useCallback(async (targetPage = 1, append = false) => {
    if (!userId) return;
    if (targetPage === 1) setLoading(true);
    else setIsLoadingMore(true);

    try {
      const normalizedSearch = searchTerm ? searchTerm.replace(/[+\-\s()]/g, '') : searchTerm;
      const response = await fetchConversationLists(targetPage, 100, userId, normalizedSearch);
      let rawList = response?.data?.rd || [];
      const rd1List = response?.data?.rd1 || [];

      if (rawList.length === 0 && rd1List.length > 0) {
        rawList = rd1List.map((c) => ({
          Id: c.CustomerId,
          ConversationId: c.CustomerId,
          CustomerId: c.CustomerId,
          CustomerPhone: c.CustomerPhone,
          CustomerName: c.CustomerName,
          WhatsappCustName: null,
          IsPin: 0,
          IsStar: 0,
          IsArchived: 0,
          UnReadMsgCount: 0,
          LastMessage: null,
          TagList: null,
          BindId: null,
          UserId: null,
          IsAssign: null,
          ...c,
        }));
      }

      const list = processApiResponse(rawList);

      if (append) {
        const mergeAndSort = (prev) => {
          const prevMap = new Map(prev.map((c) => [c.Id, c]));
          list.forEach((item) => {
            const existing = prevMap.get(item.Id);
            if (existing) {
              prevMap.set(item.Id, { ...existing, ...item });
            } else {
              prevMap.set(item.Id, item);
            }
          });
          return Array.from(prevMap.values()).sort((a, b) => {
            const tA = new Date(a.lastMessageTimestamp || a.DateTime || 0).getTime();
            const tB = new Date(b.lastMessageTimestamp || b.DateTime || 0).getTime();
            return tB - tA;
          });
        };
        setConversations((prev) => mergeAndSort(prev));
        if (!searchTerm) {
          setAllConversationsCache((prev) => mergeAndSort(prev));
        }
      } else {
        setConversations(list);
        onConversationList?.(list);
        if (!searchTerm) {
          setAllConversationsCache(list);
        }
      }

      const hasMoreFromRd1 = rawList.length > 0 && rd1List.length === 0 ? (response?.hasMore ?? false) : false;
      setHasMore(hasMoreFromRd1);
      setPage(targetPage);
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  }, [userId, onConversationList, searchTerm]);

  // Handle search term changes: wait for tags first, then load conversations
  useEffect(() => {
    if (!auth?.token || !userId) return;
    if (tagsLoading) return; // tags API first

    if (!searchTerm.trim()) {
      if (allConversationsCache.length > 0) {
        // Restore from cache instantly without API call
        setConversations(allConversationsCache);
        onConversationList?.(allConversationsCache);
        setPage(1);
        setHasMore(true);
        setLoading(false);
      } else {
        // No cache yet (initial load), fetch from API
        loadConversations(1, false);
      }
    } else {
      // Fetch search results from API
      loadConversations(1, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth?.token, userId, searchTerm, tagsLoading]);

  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase().replace(/[+\-\s()]/g, '');
    return conversations.filter((c) => {
      const name = String(getCustomerDisplayName(c) || '').toLowerCase();
      const phone = String(c.CustomerPhone || '').toLowerCase().replace(/[+\-\s()]/g, '');
      const matchesSearch = !term || name.includes(term) || phone.includes(term);
      if (!matchesSearch) return false;

      const isFavorite = c.IsStar === 1;
      switch (tabValue) {
        case 1: return c.IsAssign == 1;
        case 2: return isFavorite;
        default: return true;
      }
    }).filter((c) => {
      if (tagsLoading) return true;
      if (!selectedTag || selectedTag === 'All') return true;
      return !c.tags || c.tags.length === 0 || c.tags.some((tag) => String(getTagId(tag)) === String(getTagId(selectedTag)));
    });
  }, [conversations, searchTerm, tabValue, selectedTag, tagsLoading]);

  const deferredTagSearch = useDeferredValue(tagSearchTerm);

  const filteredTagsForMenu = useMemo(() => {
    const list = Array.isArray(allTags) ? allTags : [];
    const q = String(deferredTagSearch || '').trim().toLowerCase();
    if (!q) return list;
    return list.filter((t) => String(t?.TagName || '').toLowerCase().includes(q));
  }, [allTags, deferredTagSearch]);

  // Sync all keyboard-relevant state into a single ref (cheap, no re-renders)
  useEffect(() => {
    kbRef.current.searchTerm = searchTerm;
  }, [searchTerm]);
  useEffect(() => {
    kbRef.current.highlightedIndex = highlightedIndex;
  }, [highlightedIndex]);
  useEffect(() => {
    kbRef.current.filtered = filtered;
  }, [filtered]);
  useEffect(() => {
    kbRef.current.anchorEl = anchorEl;
    kbRef.current.contextMenu = contextMenu;
    kbRef.current.addCustomerDialogOpen = addCustomerDialogOpen;
  }, [anchorEl, contextMenu, addCustomerDialogOpen]);

  // Reset keyboard highlight when filtered list changes
  useEffect(() => {
    setHighlightedIndex(-1);
    kbRef.current.highlightedIndex = -1;
  }, [filtered.length, searchTerm, tabValue]);

  // Keyboard navigation: single listener, never re-registers (zero deps)
  useEffect(() => {
    const handleKeyDown = (e) => {
      const s = kbRef.current;

      // Block when menus / dialogs are open
      if (s.anchorEl || s.contextMenu || s.addCustomerDialogOpen) return;

      const activeEl = document.activeElement;
      const isSearchFocused = activeEl === searchInputRef.current;
      const isTyping = activeEl && (
        activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        activeEl.isContentEditable
      );
      if (isTyping && !isSearchFocused) return;

      const list = s.filtered;
      if (list.length === 0) return;

      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault();
          if (isSearchFocused) {
            searchInputRef.current?.blur();
            setHighlightedIndex(0);
          } else {
            setHighlightedIndex((prev) => {
              const next = prev + 1;
              return next >= list.length ? 0 : next;
            });
          }
          break;
        }
        case 'ArrowUp': {
          e.preventDefault();
          if (isSearchFocused) {
            searchInputRef.current?.blur();
            setHighlightedIndex(list.length - 1);
          } else {
            setHighlightedIndex((prev) => {
              const next = prev - 1;
              return next < 0 ? list.length - 1 : next;
            });
          }
          break;
        }
        case 'Enter': {
          e.preventDefault();
          if (isSearchFocused && list.length > 0) {
            searchInputRef.current?.blur();
            handleSelectCustomer(list[0]);
            setHighlightedIndex(0);
          } else {
            const idx = s.highlightedIndex;
            if (idx >= 0 && idx < list.length) {
              handleSelectCustomer(list[idx]);
            }
          }
          break;
        }
        case 'Escape': {
          e.preventDefault();
          if (s.searchTerm) {
            setSearchTerm('');
          }
          setHighlightedIndex(-1);
          searchInputRef.current?.focus();
          break;
        }
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch all tags for filtering
  useEffect(() => {
    if (!auth?.userId) return;
    setTagsLoading(true);
    const controller = new AbortController();
    (async () => {
      try {
        const resp = await fetchAllTags(auth.userId, controller.signal);
        if (resp?.rd) {
          setAllTags(resp.rd);
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Failed to fetch tags:', err);
        }
      } finally {
        setTagsLoading(false);
      }
    })();
    return () => controller.abort();
  }, [auth?.userId]);

  // Delay showing 'No conversations found' to prevent flash during loading
  useEffect(() => {
    const isEmpty = !loading && !tagsLoading && filtered.length === 0;
    if (!isEmpty) {
      setShowEmptyAfterDelay(false);
      return;
    }
    const timer = setTimeout(() => setShowEmptyAfterDelay(true), 600);
    return () => clearTimeout(timer);
  }, [loading, tagsLoading, filtered.length]);

  // Scroll highlighted item into view instantly (auto) via rAF for rapid keys
  useEffect(() => {
    if (highlightedIndex >= 0 && itemRefs.current[highlightedIndex]) {
      requestAnimationFrame(() => {
        itemRefs.current[highlightedIndex]?.scrollIntoView({
          behavior: 'auto',
          block: 'nearest',
        });
      });
    }
  }, [highlightedIndex]);

  const handleContextMenu = (e, member) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ mouseX: e.clientX + 2, mouseY: e.clientY + 2 });
    setContextMember(member);
  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
    setContextMember(null);
  };

  const handleOpenMenu = (e, member) => {
    e.stopPropagation();
    setAnchorEl(e.currentTarget);
    setMenuMember(member);
    onConversationList?.(member);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
    setMenuMember(null);
  };

  const handleOpenAddCustomer = (member) => {
    setAddCustomerMember(member);
    setAddCustomerDialogOpen(true);
  };

  const handleCloseAddCustomer = () => {
    setAddCustomerDialogOpen(false);
    setAddCustomerMember(null);
  };

  const handleSelectCustomer = useCallback((customer) => {
    if (customer) {
      const convId = String(customer?.ConversationId ?? customer?.Id ?? customer?.CustomerId);
      useChatStore.getState().setSelectedConversationId(convId);
      // Optimistically clear unread count locally for instant UI feedback
      const unread = customer?.unreadCount ?? customer?.UnReadMsgCount ?? 0;
      if (unread > 0) {
        useChatStore.getState().clearConversationUnread(convId);
      }
    } else {
      useChatStore.getState().setSelectedConversationId(null);
    }
    onCustomerSelect?.(customer);
  }, [onCustomerSelect]);

  const handleItemDragOver = useCallback((e, member) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverId(member.Id);
  }, []);

  const handleItemDragLeave = useCallback((e, member) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverId((prev) => (prev === member.Id ? null : prev));
  }, []);

  const handleItemDrop = useCallback((e, member) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverId(null);
    const files = e.dataTransfer?.files;
    if (files?.length) {
      // Only switch conversation if dropping on a different one
      if (selectedCustomer?.Id !== member.Id) {
        handleSelectCustomer(member);
      }
      onFileDrop?.(files);
    }
  }, [handleSelectCustomer, onFileDrop, selectedCustomer]);

  const handleAddCustomerSuccess = async () => {
    // Refresh conversation list after adding customer
    if (!auth?.userId) return;
    try {
      const normalizedSearch = searchTerm ? searchTerm.replace(/[+\-\s()]/g, '') : searchTerm;
      const res = await fetchConversationLists(1, 100, auth.userId, normalizedSearch);
      const rawRd = res?.data?.rd || [];
      const rawRd1 = res?.data?.rd1 || [];
      let rawList = rawRd;
      if (rawList.length === 0 && rawRd1.length > 0) {
        rawList = rawRd1.map((c) => ({
          Id: c.CustomerId,
          ConversationId: c.CustomerId,
          CustomerId: c.CustomerId,
          CustomerPhone: c.CustomerPhone,
          CustomerName: c.CustomerName,
          WhatsappCustName: null,
          IsPin: 0,
          IsStar: 0,
          IsArchived: 0,
          UnReadMsgCount: 0,
          LastMessage: null,
          TagList: null,
          BindId: null,
          UserId: null,
          IsAssign: null,
          ...c,
        }));
      }
      if (rawList.length > 0) {
        const processed = processApiResponse(rawList);
        setConversations(processed);
        onConversationList?.(processed);
      }
    } catch (err) {
      console.error('Failed to refresh conversations:', err);
    }
  };

  const handleMenuAction = async (action) => {
    handleCloseMenu();
    handleCloseContextMenu();

    const member = menuMember || contextMember;
    if (!member?.ConversationId || !auth?.userId) return;

    const convId = member.ConversationId;
    const userId = auth.userId;
    const email = auth?.email || auth?.userId || '';

    try {
      let response;
      switch (action) {
        case 'Pin':
          response = await pinConversationApi(convId, userId, email);
          break;
        case 'UnPin':
          response = await unPinConversationApi(convId, userId, email);
          break;
        case 'Star':
          response = await favoriteApi(convId, userId, email);
          break;
        case 'UnStar':
          response = await unFavoriteApi(convId, userId, email);
          break;
        case 'Archive':
          response = await archieveApi(convId, userId, email);
          break;
        case 'UnArchive':
          response = await unArchieveApi(convId, userId, email);
          break;
        case 'AddCustomer':
          handleOpenAddCustomer(member);
          return;
        default:
          return;
      }

      if (response) {
        toast.success(`${action} successful`);
        // Refresh conversation list to reflect change
        const res = await fetchConversationLists(userId);
        const rawRd = res?.data?.rd || [];
        const rawRd1 = res?.data?.rd1 || [];
        let rawList = rawRd;
        if (rawList.length === 0 && rawRd1.length > 0) {
          rawList = rawRd1.map((c) => ({
            Id: c.CustomerId,
            ConversationId: c.CustomerId,
            CustomerId: c.CustomerId,
            CustomerPhone: c.CustomerPhone,
            CustomerName: c.CustomerName,
            WhatsappCustName: null,
            IsPin: 0,
            IsStar: 0,
            IsArchived: 0,
            UnReadMsgCount: 0,
            LastMessage: null,
            TagList: null,
            BindId: null,
            UserId: null,
            IsAssign: null,
            ...c,
          }));
        }
        if (rawList.length > 0) {
          const processed = processApiResponse(rawList);
          setConversations(processed);
        }
      } else {
        toast.error(`${action} failed`);
      }
    } catch (err) {
      console.error('Menu action error:', err);
      toast.error(`${action} failed`);
    }
  };

  return (
    <div className="chat-sidebar">
      {/* Header */}
      <div className="chat-sidebar-header">
        <h3 className="chat-sidebar-title">Waba Chat</h3>
      </div>

      {/* Search */}
      <div className="chat-sidebar-search">
        <Search size={16} className="chat-search-icon" />
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search conversations"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="chat-search-input"
        />
        {searchTerm && (
          <IconButton size="small" onClick={() => setSearchTerm('')} className="chat-search-clear">
            <X size={14} />
          </IconButton>
        )}
      </div>

      {/* Tabs */}
      <div className="chat-sidebar-filters">
        <div className="chat-tab-buttons">
          {TAB_ITEMS.map((item) => {
            const isActive = tabValue === item.value;
            return (
              <button
                key={item.value}
                type="button"
                className={`chat-tab-btn ${isActive ? 'active' : ''}`}
                onClick={() => setTabValue(item.value)}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tag filter — 'All' always visible, skeleton chips while loading */}
      <div className="chat-sidebar-tag-filter">
        <div className="tag-filter-scroll">
          {!tagsLoading && allTags?.length > 0 && (
            <button
              type="button"
              className={`tag-filter-chip ${selectedTag === 'All' ? 'active' : ''}`}
              onClick={() => onTagSelect?.('All')}
            >
              All
            </button>
          )}

          {tagsLoading && (
            <>
              <span className="tag-filter-chip" style={{ pointerEvents: 'none', opacity: 0.6 }}>
                <Skeleton variant="rounded" width="100%" height={16} sx={{ borderRadius: 99 }} />
              </span>
              <span className="tag-filter-chip" style={{ pointerEvents: 'none', opacity: 0.6 }}>
                <Skeleton variant="rounded" width="100%" height={16} sx={{ borderRadius: 99 }} />
              </span>
              <span className="tag-filter-chip" style={{ pointerEvents: 'none', opacity: 0.6 }}>
                <Skeleton variant="rounded" width="100%" height={16} sx={{ borderRadius: 99 }} />
              </span>
              <span className="tag-filter-chip" style={{ pointerEvents: 'none', opacity: 0.6 }}>
                <Skeleton variant="rounded" width="100%" height={16} sx={{ borderRadius: 99 }} />
              </span>
            </>
          )}

          {!tagsLoading && allTags?.slice(0, 4).map((tag) => {
            const isActive = selectedTag !== 'All' && String(getTagId(selectedTag)) === String(getTagId(tag));
            return (
              <button
                key={getTagId(tag)}
                type="button"
                className={`tag-filter-chip ${isActive ? 'active' : ''}`}
                onClick={() => {
                  if (isActive) {
                    onTagSelect?.('All');
                  } else {
                    onTagSelect?.(tag);
                  }
                }}
                title={tag.TagName}
              >
                <span
                  className="tag-filter-dot"
                  style={{ backgroundColor: tag.color || '#1daa61' }}
                />
                <span className="tag-filter-name">{tag.TagName}</span>
              </button>
            );
          })}

          {!tagsLoading && allTags?.length > 4 && (
            <button
              type="button"
              className="tag-filter-chip tag-filter-more"
              onClick={(e) => setTagMenuAnchor(e.currentTarget)}
              title={`${allTags.length - 4} more tags`}
            >
              <Tag size={14} />
              <span>More</span>
              <span className="tag-filter-more-count">{allTags.length - 4}</span>
            </button>
          )}
        </div>
      </div>

      {/* Tag filter menu */}
      <Menu
        className="tag-filter-menu"
        anchorEl={tagMenuAnchor}
        open={Boolean(tagMenuAnchor)}
        onClose={() => {
          setTagMenuAnchor(null);
          setTagSearchTerm('');
        }}
        disableAutoFocusItem
        slotProps={{
          paper: {
            elevation: 0,
            sx: {
              minWidth: 260,
              maxHeight: 420,
              borderRadius: 3,
              boxShadow: '0 12px 40px rgba(0,0,0,0.14)',
              border: '1px solid rgba(0,0,0,0.06)',
              overflow: 'hidden',
            },
          },
        }}
      >
        {/* Sticky search header */}
        <div className="tag-filter-menu-header">
          <Search size={14} color="#888" style={{ flexShrink: 0 }} />
          <input
            ref={tagSearchInputRef}
            type="text"
            placeholder="Search tags..."
            value={tagSearchTerm}
            onChange={(e) => setTagSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                e.stopPropagation();
                const first = tagMenuItemRefs.current[0];
                if (first) first.focus();
              } else if (e.key === 'Escape') {
                e.stopPropagation();
                setTagMenuAnchor(null);
                setTagSearchTerm('');
              }
            }}
            className="tag-filter-search-input"
            autoFocus
          />
          {tagSearchTerm && (
            <button
              type="button"
              className="tag-filter-search-clear"
              onClick={() => {
                setTagSearchTerm('');
                tagSearchInputRef.current?.focus();
              }}
              tabIndex={-1}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* All / Clear filter */}
        <MenuItem
          ref={(el) => { tagMenuItemRefs.current[0] = el; }}
          selected={selectedTag === 'All'}
          onClick={() => {
            onTagSelect?.('All');
            setTagMenuAnchor(null);
            setTagSearchTerm('');
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp') {
              e.preventDefault();
              e.stopPropagation();
              tagSearchInputRef.current?.focus();
            }
          }}
          sx={{ py: 1.2, display: 'flex', alignItems: 'center', gap: 1.5 }}
        >
          <span style={{ width: 20, display: 'flex', justifyContent: 'center' }}>
            {selectedTag === 'All' && <Check size={16} color="#1daa61" strokeWidth={2.5} />}
          </span>
          <span style={{ fontSize: 14, fontWeight: selectedTag === 'All' ? 600 : 500, color: '#555' }}>
            All conversations
          </span>
        </MenuItem>

        {/* Tag list */}
        {filteredTagsForMenu.map((tag, idx) => {
          const isActive = selectedTag !== 'All' && String(getTagId(selectedTag)) === String(getTagId(tag));
          const refIndex = idx + 1;
          return (
            <MenuItem
              key={getTagId(tag)}
              ref={(el) => { tagMenuItemRefs.current[refIndex] = el; }}
              selected={isActive}
              onClick={() => {
                if (isActive) {
                  onTagSelect?.('All');
                } else {
                  onTagSelect?.(tag);
                }
                setTagMenuAnchor(null);
                setTagSearchTerm('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowUp' && refIndex === 0) {
                  e.preventDefault();
                  e.stopPropagation();
                  tagSearchInputRef.current?.focus();
                }
              }}
              sx={{ py: 1.2, display: 'flex', alignItems: 'center', gap: 1.5 }}
            >
              <span style={{ width: 20, display: 'flex', justifyContent: 'center' }}>
                {isActive && <Check size={16} color="#1daa61" strokeWidth={2.5} />}
              </span>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: tag.color || '#1daa61',
                  display: 'inline-block',
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: 14, fontWeight: isActive ? 600 : 500, overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                {tag.TagName}
              </span>
              {isActive && (
                <span style={{ fontSize: 11, color: '#1daa61', fontWeight: 600 }}>Active</span>
              )}
            </MenuItem>
          );
        })}

        {filteredTagsForMenu.length === 0 && (
          <MenuItem disabled sx={{ opacity: 0.6, justifyContent: 'center', py: 2 }}>
            <span style={{ fontSize: 13, color: '#888' }}>No tags found</span>
          </MenuItem>
        )}
      </Menu>

      {/* List */}
      {!can(15) ? (
        <div className="chat-sidebar-list">
          <div className="chat-empty" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            No access to conversations
          </div>
        </div>
      ) : (
        <div className="chat-sidebar-list">
          {loading && (
            <ul>
              {Array.from({ length: 13 }).map((_, i) => (
                <li key={`skel-${i}`} className="chat-sidebar-skeleton">
                  <div className="member-item">
                    <div className="member-avatar">
                      <Skeleton variant="circular" animation="wave" width={40} height={40} sx={{ borderRadius: '50% !important' }} />
                    </div>
                    <div className="member-info">
                      <div className="member-header">
                        <Skeleton variant="text" animation="wave" width="60%" height={18} />
                        <Skeleton variant="text" animation="wave" width={40} height={15} />
                      </div>
                      <div className="member-message">
                        <Skeleton variant="text" animation="wave" width="80%" height={15} />
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {showEmptyAfterDelay && (
            <div className="chat-empty">No conversations found</div>
          )}

          <ul
            ref={listRef}
            onScroll={() => {
              const el = listRef.current;
              if (!el || isLoadingMore || !hasMore || loading) return;
              const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= 5;
              if (atBottom) {
                loadConversations(page + 1, true);
              }
            }}
          >
            {filtered.map((member, index) => {
              const isSelected = selectedCustomer?.Id === member.Id;
              const isMenuOpen = Boolean(anchorEl) && menuMember?.Id === member.Id;
              const isKeyboardHighlighted = highlightedIndex === index;
              const shouldShowUnread = member.unreadCount > 0;
              const name = member.name || getCustomerDisplayName(member);

              const isDragOver = dragOverId === member.Id;

              return (
                <li
                  key={member.Id}
                  ref={(el) => { itemRefs.current[index] = el; }}
                  className={`${isSelected ? 'active' : ''} ${member?.isReading ? 'reading' : ''} ${isMenuOpen ? 'menu-open' : ''} ${isKeyboardHighlighted ? 'keyboard-highlight' : ''} ${isDragOver ? 'drag-over' : ''}`}
                  onContextMenu={(e) => handleContextMenu(e, member)}
                  onDragOver={(e) => handleItemDragOver(e, member)}
                  onDragLeave={(e) => handleItemDragLeave(e, member)}
                  onDrop={(e) => handleItemDrop(e, member)}
                >
                  <div
                    className={`member-item ${isSelected ? 'active' : ''} ${member?.isReading ? 'reading' : ''} ${isMenuOpen ? 'menu-open' : ''} ${isKeyboardHighlighted ? 'keyboard-highlight' : ''}`}
                    onClick={() => handleSelectCustomer(member)}
                  >
                    <div className="member-avatar">
                      {!hasCustomerName(member) ? (
                        <Avatar {...getWhatsAppAvatarConfig(getCustomerAvatarSeed(member), 38)}>
                          <PersonIcon size={16} />
                        </Avatar>
                      ) : (
                        <Avatar {...member.avatarConfig} />
                      )}
                    </div>

                    <div className="member-info">
                      <div className="member-header">
                        <span className={shouldShowUnread ? 'member-name-unread' : 'member-name'}>
                          {name}
                        </span>
                        {member?.lastMessageText && member?.lastMessageText !== 'No message' && (
                          <span className="member-time">{member.lastMessageTime}</span>
                        )}
                      </div>
                      <div className="member-message">
                        <span className={shouldShowUnread ? 'last-message-unread' : 'last-message'}>
                          <span className="last-message-content">
                            <span className="last-message-icon">
                              {getMessageStatusIcon(member)}
                            </span>
                            <span className="last-message-text">
                              {member.lastMessageText ? (
                                member.lastMessageText !== 'No message' ? (
                                  member.lastMessage
                                ) : (
                                  <span className="last-message-attachment">{member.lastMessage}</span>
                                )
                              ) : (
                                member.CustomerPhone || ''
                              )}
                            </span>
                          </span>
                        </span>
                        <span className="member-trailing">
                          {shouldShowUnread && (
                            <Badge
                              badgeContent={member.unreadCount}
                              color="primary"
                              className="unread-badge"
                            />
                          )}

                          <div className="member-actions-bar">
                            {member?.IsPin === 1 && (
                              <Tooltip title={member?.IsPin === 1 ? 'Unpin' : 'Pin'} arrow>
                                <IconButton
                                  size="small"
                                  className={`action-btn ${member?.IsPin === 1 ? 'is-on' : ''}`}
                                  onClick={(e) => { e.stopPropagation(); }}
                                >
                                  <Pin size={17} />
                                </IconButton>
                              </Tooltip>
                            )}
                            {member?.IsStar === 1 && (
                              <Tooltip title={member?.IsStar === 1 ? 'Unfavourite' : 'favourite'} arrow>
                                <IconButton
                                  size="small"
                                  className={`action-btn ${member?.IsStar === 1 ? 'is-on' : ''}`}
                                  onClick={(e) => { e.stopPropagation(); }}
                                >
                                  <Star size={17} />
                                </IconButton>
                              </Tooltip>
                            )}
                            {member?.CustomerName === '' && (
                              <Tooltip title="Add to Customer" arrow>
                                <IconButton
                                  size="small"
                                  className="action-btn add-customer-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenAddCustomer(member);
                                  }}
                                >
                                  <UserPlus size={16} />
                                </IconButton>
                              </Tooltip>
                            )}
                            <Tooltip title="More" arrow>
                              <IconButton
                                className="action-btn more-btn"
                                size="small"
                                onClick={(e) => handleOpenMenu(e, member)}
                              >
                                <ChevronDown size={17} />
                              </IconButton>
                            </Tooltip>
                          </div>
                        </span>
                      </div>
                      {Array.isArray(member.tags) && member.tags.length > 0 && (
                        <div className="conversation-tags-row">
                          {member.tags.slice(0, 3).map((tag) => (
                            <span key={getTagId(tag)} className="conversation-tag-chip" title={tag.TagName}>
                              <span
                                className="conversation-tag-dot"
                                style={{ backgroundColor: tag.color || '#1daa61' }}
                              />
                              {tag.TagName}
                            </span>
                          ))}
                          {member.tags.length > 3 && (
                            <span className="conversation-tag-chip">+{member.tags.length - 3}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}

            {isLoadingMore && (
              <li className="chat-sidebar-loader" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px 0', gap: 8, listStyle: 'none' }}>
                <CircularProgress size={20} thickness={4} sx={{ color: '#1daa61' }} />
                <span style={{ fontSize: 12, color: '#888' }}>Loading conversations...</span>
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Dropdown Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
        onClick={(e) => e.stopPropagation()}
        slotProps={{
          paper: {
            elevation: 0,
            sx: {
              minWidth: 180,
              borderRadius: 2,
              py: 0.5,
              boxShadow: '0px 6px 18px rgba(0,0,0,0.12), 0px 3px 6px rgba(0,0,0,0.08)',
            },
          },
        }}
      >
        {getMenuItems(menuMember, can).map((item, index) => (
          <MenuItem
            key={item.action || index}
            onClick={() => handleMenuAction(item.action)}
            sx={{
              py: 1.1,
              px: 2,
              borderRadius: 1.5,
              transition: 'all 0.2s ease',
              '&:hover': {
                backgroundColor: 'action.hover',
                transform: 'translateX(3px)',
              },
            }}
          >
            {item.icon && (
              <span style={{ minWidth: 30, display: 'inline-flex', alignItems: 'center' }}>{item.icon}</span>
            )}
            <span style={{ fontSize: 14, fontWeight: 500 }}>{item.label}</span>
          </MenuItem>
        ))}
      </Menu>

      {/* Context Menu */}
      <Menu
        open={Boolean(contextMenu)}
        onClose={handleCloseContextMenu}
        anchorReference="anchorPosition"
        anchorPosition={contextMenu ? { top: contextMenu.mouseY, left: contextMenu.mouseX } : undefined}
        onClick={(e) => e.stopPropagation()}
        slotProps={{
          paper: {
            elevation: 0,
            sx: {
              minWidth: 180,
              borderRadius: 2,
              py: 0.5,
              boxShadow: '0px 6px 18px rgba(0,0,0,0.12), 0px 3px 6px rgba(0,0,0,0.08)',
            },
          },
        }}
      >
        {getMenuItems(contextMember, can).map((item, index) => (
          <MenuItem
            key={item.action || index}
            onClick={() => handleMenuAction(item.action)}
            sx={{
              py: 1.1,
              px: 2,
              borderRadius: 1.5,
              transition: 'all 0.2s ease',
              '&:hover': {
                backgroundColor: 'action.hover',
                transform: 'translateX(3px)',
              },
            }}
          >
            {item.icon && (
              <span style={{ minWidth: 30, display: 'inline-flex', alignItems: 'center' }}>{item.icon}</span>
            )}
            <span style={{ fontSize: 14, fontWeight: 500 }}>{item.label}</span>
          </MenuItem>
        ))}
      </Menu>

      {/* Add Customer Dialog */}
      <AddCustomerDialog
        open={addCustomerDialogOpen}
        onClose={handleCloseAddCustomer}
        selectedMember={addCustomerMember}
        onSuccess={handleAddCustomerSuccess}
      />
    </div>
  );
}

export default memo(ChatSidebar);
