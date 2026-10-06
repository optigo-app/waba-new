'use client';

import { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import { Avatar, Badge, IconButton, Menu, MenuItem, Tooltip, Skeleton, CircularProgress, Dialog, DialogTitle, List, ListItem, ListItemAvatar, ListItemText, DialogContent } from '@mui/material';
import {
  Search, Pin, PinOff, Star, Archive, ArchiveRestore,
  ChevronDown, ChevronLeft, ChevronRight, UserPlus, X, Check, MessageCircle, Smartphone, ChevronsUpDown, Flag, ArrowLeft,
} from 'lucide-react';
import {
  getWhatsAppAvatarConfig, getCustomerDisplayName, getCustomerAvatarSeed,
  hasCustomerName, processApiResponse, getMessageStatusIcon, getMessagePreview,
  getChannelAvatarConfig, getChannelDisplayName, getChannelMobile, getChannelSubName,
  sortConversations,
} from './utils/chatUtils';
import { formatChatTimestamp } from './utils/dateUtils';
import {
  fetchConversationLists,
  fetchAllTags,
  fetchChannels,
  pinConversationApi,
  unPinConversationApi,
  favoriteApi,
  unFavoriteApi,
  archieveApi,
  unArchieveApi,
} from '../../api/chat/conversationApi';
import AddCustomerDialog from './AddCustomerDialog';
import WhatsAppText from './WhatsAppText';
import ChatPanelHeader from './ChatPanelHeader';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';
import { useTagsContext } from '../../contexts/TagsContexts';
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
      icon: member?.IsStar === 1 ? <Star size={18} fill="#facc15" color="#facc15" /> : <Star size={18} />,
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
  channelId,
  channel,
  onChannelSelect,
  channelSwitching,
}) {
  const auth = useAuthStore((s) => s.auth);
  const can = useAuthStore((s) => s.can);
  const userId = auth?.userId || auth?.userid || auth?.appuserid || '';
  const { refetchTrigger } = useTagsContext();
  const conversations = useChatStore((s) => s.conversations);
  const allConversationsCache = useChatStore((s) => s.allConversationsCache);
  const conversationsByChannel = useChatStore((s) => s.conversationsByChannel);
  const setConversations = useChatStore.getState().setConversations;
  const setAllConversationsCache = useChatStore.getState().setAllConversationsCache;
  const setConversationsByChannel = useChatStore.getState().setConversationsByChannel;
  const [loading, setLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [allTags, setAllTags] = useState([]);
  const [tagsLoading, setTagsLoading] = useState(true);
  const [showEmptyAfterDelay, setShowEmptyAfterDelay] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [contextMember, setContextMember] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [menuMember, setMenuMember] = useState(null);
  const [addCustomerDialogOpen, setAddCustomerDialogOpen] = useState(false);
  const [addCustomerMember, setAddCustomerMember] = useState(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [dragOverId, setDragOverId] = useState(null);
  const [channelDialogOpen, setChannelDialogOpen] = useState(false);
  const [channelList, setChannelList] = useState([]);
  const [channelListLoading, setChannelListLoading] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const listRef = useRef(null);
  const tagFilterScrollRef = useRef(null);
  const [canScrollTagsLeft, setCanScrollTagsLeft] = useState(false);
  const [canScrollTagsRight, setCanScrollTagsRight] = useState(false);
  const itemRefs = useRef({});
  const searchInputRef = useRef(null);

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
      const currentTagId = selectedTag && selectedTag !== 'All' ? (getTagId(selectedTag) || '') : '';
      const response = await fetchConversationLists(targetPage, 20, userId, normalizedSearch, currentTagId, unreadOnly);
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
          return sortConversations(Array.from(prevMap.values()));
        };
        setConversations((prev) => mergeAndSort(prev));
        if (!searchTerm) {
          setAllConversationsCache((prev) => mergeAndSort(prev));
        }
      } else {
        setConversations(list);
        onConversationList?.(list);
        // Only update caches when no search, tag, or unread filter —
        // otherwise we'd overwrite the full list with filtered results
        if (!searchTerm && !unreadOnly && (!selectedTag || selectedTag === 'All')) {
          setAllConversationsCache(list);
          if (channelId) {
            setConversationsByChannel(channelId, list);
          }
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
  }, [userId, onConversationList, searchTerm, channelId, selectedTag, unreadOnly]);

  // Reset archived view when switching channels
  useEffect(() => {
    setShowArchived(false);
  }, [channelId]);

  // Handle search term / channel / tag changes: wait for tags first, then load conversations
  useEffect(() => {
    if (!auth?.token || !userId) return;
    if (tagsLoading) return; // tags API first

    // Reset archived view when switching channels or searching
    if (searchTerm.trim()) {
      setShowArchived(false);
    }

    // Check per-channel cache first (only when no search, tag, or unread filter)
    if (!searchTerm.trim() && !unreadOnly && channelId && (selectedTag === 'All' || !selectedTag)) {
      const channelCache = conversationsByChannel[String(channelId)];
      if (channelCache && channelCache.length > 0) {
        setConversations(channelCache);
        onConversationList?.(channelCache);
        setPage(1);
        setHasMore(true);
        setLoading(false);
        return;
      }
    }

    // Fall back to allConversationsCache when no specific channel, tag, or unread filter
    if (!searchTerm.trim() && !unreadOnly && !channelId && (selectedTag === 'All' || !selectedTag) && allConversationsCache.length > 0) {
      setConversations(allConversationsCache);
      onConversationList?.(allConversationsCache);
      setPage(1);
      setHasMore(true);
      setLoading(false);
    } else {
      // Fetch results for the selected channel, search, or tag filter
      loadConversations(1, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth?.token, userId, searchTerm, tagsLoading, channelId, selectedTag, unreadOnly]);

  const unreadConversationsCount = useMemo(
    () => conversations.filter((c) => Number(c?.unreadCount ?? c?.UnReadMsgCount ?? 0) > 0).length,
    [conversations]
  );

  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase().replace(/[+\-\s()]/g, '');
    return conversations.filter((c) => {
      const name = String(getCustomerDisplayName(c) || '').toLowerCase();
      const phone = String(c.CustomerPhone || '').toLowerCase().replace(/[+\-\s()]/g, '');
      const matchesSearch = !term || name.includes(term) || phone.includes(term);
      if (!matchesSearch) return false;

      // Client-side unread filter — keeps the chip correct even for
      // cached lists and live unread bumps between API refreshes
      if (unreadOnly && Number(c?.unreadCount ?? c?.UnReadMsgCount ?? 0) <= 0) return false;

      const isFavorite = c.IsStar === 1;
      switch (tabValue) {
        case 1: return c.IsAssign == 1;
        case 2: return isFavorite;
        default: return true;
      }
    });
  }, [conversations, searchTerm, tabValue, unreadOnly]);

  const archivedConversations = useMemo(
    () => filtered.filter((c) => c.IsArchived === 1),
    [filtered]
  );

  const activeConversations = useMemo(
    () => filtered.filter((c) => c.IsArchived !== 1),
    [filtered]
  );

  const displayedConversations = showArchived ? archivedConversations : activeConversations;

  const checkTagFilterScroll = useCallback(() => {
    const el = tagFilterScrollRef.current;
    if (!el) return;
    setCanScrollTagsLeft(el.scrollLeft > 0);
    setCanScrollTagsRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  }, []);

  const scrollTagRow = useCallback((direction) => {
    const el = tagFilterScrollRef.current;
    if (el) el.scrollBy({ left: direction === 'left' ? -160 : 160, behavior: 'smooth' });
  }, []);

  // Track scroll edges for prev/next buttons + mouse-wheel horizontal scroll
  useEffect(() => {
    const el = tagFilterScrollRef.current;
    if (!el) return;
    checkTagFilterScroll();
    const onWheel = (e) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };
    el.addEventListener('scroll', checkTagFilterScroll, { passive: true });
    el.addEventListener('wheel', onWheel, { passive: false });
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(checkTagFilterScroll) : null;
    observer?.observe(el);
    return () => {
      el.removeEventListener('scroll', checkTagFilterScroll);
      el.removeEventListener('wheel', onWheel);
      observer?.disconnect();
    };
  }, [checkTagFilterScroll, allTags, tagsLoading]);

  // Sync all keyboard-relevant state into a single ref (cheap, no re-renders)
  useEffect(() => {
    kbRef.current.searchTerm = searchTerm;
  }, [searchTerm]);
  useEffect(() => {
    kbRef.current.highlightedIndex = highlightedIndex;
  }, [highlightedIndex]);
  useEffect(() => {
    kbRef.current.filtered = displayedConversations;
  }, [displayedConversations]);
  useEffect(() => {
    kbRef.current.anchorEl = anchorEl;
    kbRef.current.contextMenu = contextMenu;
    kbRef.current.addCustomerDialogOpen = addCustomerDialogOpen;
  }, [anchorEl, contextMenu, addCustomerDialogOpen]);

  // Reset keyboard highlight when filtered list changes
  useEffect(() => {
    setHighlightedIndex(-1);
    kbRef.current.highlightedIndex = -1;
  }, [filtered.length, searchTerm, tabValue, showArchived]);

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

  // Fetch all tags for filtering (re-fetch when a tag is added via TagsContext or channel changes)
  useEffect(() => {
    if (!auth?.userId) return;
    setTagsLoading(true);
    setAllTags([]);
    const controller = new AbortController();
    (async () => {
      try {
        const resp = await fetchAllTags(auth.userId, controller.signal);
        if (resp?.rd) {
          // Sort latest tags first (by Id descending)
          const sorted = [...resp.rd].sort((a, b) => {
            const idA = Number(a?.TagId ?? a?.Id ?? a?.id ?? 0);
            const idB = Number(b?.TagId ?? b?.Id ?? b?.id ?? 0);
            return idB - idA;
          });
          setAllTags(sorted);
        }
      } catch (err) {
        if (err.name !== 'AbortError' && err.message !== 'AbortError') {
          console.error('Failed to fetch tags:', err);
        }
      } finally {
        setTagsLoading(false);
      }
    })();
    return () => controller.abort();
  }, [auth?.userId, refetchTrigger, channelId]);

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

  /* ── Mobile channel picker dialog ── */
  const handleOpenChannelDialog = useCallback(async () => {
    if (!userId) return;
    setChannelDialogOpen(true);
    setChannelListLoading(true);
    try {
      const resp = await fetchChannels(userId);
      const data = resp?.data || [];
      setChannelList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load channels for dialog:', err);
    } finally {
      setChannelListLoading(false);
    }
  }, [userId]);

  const handlePickChannel = useCallback((ch) => {
    setChannelDialogOpen(false);
    if (!ch || ch.IsActive === 0) return;
    onChannelSelect?.(ch);
  }, [onChannelSelect]);

  const handleAddCustomerSuccess = async () => {
    // Refresh conversation list after adding customer
    if (!auth?.userId) return;
    try {
      const normalizedSearch = searchTerm ? searchTerm.replace(/[+\-\s()]/g, '') : searchTerm;
      const currentTagId = selectedTag && selectedTag !== 'All' ? (getTagId(selectedTag) || '') : '';
      const res = await fetchConversationLists(1, 20, auth.userId, normalizedSearch, currentTagId, unreadOnly);
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
    const userId = auth.id;
    const appuserId = auth.userId;
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

        // For Archive/UnArchive, update locally for instant feedback
        if (action === 'Archive' || action === 'UnArchive') {
          const newArchivedVal = action === 'Archive' ? 1 : 0;
          setConversations((prev) =>
            prev.map((c) =>
              c.Id === member.Id ? { ...c, IsArchived: newArchivedVal } : c
            )
          );
          setAllConversationsCache((prev) =>
            prev.map((c) =>
              c.Id === member.Id ? { ...c, IsArchived: newArchivedVal } : c
            )
          );
        } else {
          // For other actions, refresh conversation list to reflect change
          const currentTagId = selectedTag && selectedTag !== 'All' ? (getTagId(selectedTag) || '') : '';
          const res = await fetchConversationLists(1, 20, appuserId, '', currentTagId, unreadOnly);
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
      {/* Header — simple title only, channel info is shown in the channel panel */}
      <ChatPanelHeader
        title="Conversations"
        right={
          <>
            {onChannelSelect && (
              <IconButton
                size="small"
                className="channel-picker-btn mobile-only"
                onClick={handleOpenChannelDialog}
                aria-label="Switch channel"
              >
                <Smartphone size={18} />
              </IconButton>
            )}
          </>
        }
      />

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

      {/* Filter row — All + Unread always visible, tag chips follow */}
      <div className={`chat-sidebar-tag-filter ${tagsLoading ? 'is-loading' : 'has-tags'}`}>
        {canScrollTagsLeft && (
          <button
            type="button"
            className="tag-scroll-btn left"
            onClick={() => scrollTagRow('left')}
            aria-label="Scroll tags left"
          >
            <ChevronLeft size={16} />
          </button>
        )}
        <div className="tag-filter-scroll" ref={tagFilterScrollRef}>
          {/* All — resets tag + unread filters */}
          <button
            type="button"
            className={`tag-filter-chip ${selectedTag === 'All' && !unreadOnly ? 'active' : ''}`}
            onClick={() => {
              setUnreadOnly(false);
              onTagSelect?.('All');
            }}
          >
            All
          </button>

          {/* Unread filter — always visible, independent of tags */}
          <button
            type="button"
            className={`tag-filter-chip unread-filter-chip ${unreadOnly ? 'active' : ''}`}
            onClick={() => setUnreadOnly((v) => !v)}
            aria-pressed={unreadOnly}
            title="Show unread conversations only"
          >
            Unread
            {unreadConversationsCount > 0 && (
              <span className="unread-filter-count">{unreadConversationsCount}</span>
            )}
          </button>

          {tagsLoading && (
            <>
              <span className="tag-filter-chip tag-filter-skeleton">
                <Skeleton variant="rounded" width="100%" height={16} sx={{ borderRadius: 99 }} />
              </span>
              <span className="tag-filter-chip tag-filter-skeleton">
                <Skeleton variant="rounded" width="100%" height={16} sx={{ borderRadius: 99 }} />
              </span>
              <span className="tag-filter-chip tag-filter-skeleton">
                <Skeleton variant="rounded" width="100%" height={16} sx={{ borderRadius: 99 }} />
              </span>
              <span className="tag-filter-chip tag-filter-skeleton">
                <Skeleton variant="rounded" width="100%" height={16} sx={{ borderRadius: 99 }} />
              </span>
            </>
          )}

          {!tagsLoading && allTags?.map((tag) => {
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
                <span className="tag-filter-name">{tag.TagName}</span>
              </button>
            );
          })}

        </div>
        {canScrollTagsRight && (
          <button
            type="button"
            className="tag-scroll-btn right"
            onClick={() => scrollTagRow('right')}
            aria-label="Scroll tags right"
          >
            <ChevronRight size={16} />
          </button>
        )}
      </div>

      {/* List */}
      {!can(15) ? (
        <div className="chat-sidebar-list">
          <div className="chat-empty" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            No access to conversations
          </div>
        </div>
      ) : (
        <div className="chat-sidebar-list">
          {(loading || channelSwitching) && (
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

          {showEmptyAfterDelay && !showArchived && !channelSwitching && (
            <div className="chat-empty">No conversations found</div>
          )}

          {showEmptyAfterDelay && showArchived && archivedConversations.length === 0 && !channelSwitching && (
            <div className="chat-empty">No archived conversations</div>
          )}

          {/* WhatsApp-style Archived entry (only in main view, not searching, not switching) */}
          {!showArchived && !searchTerm.trim() && archivedConversations.length > 0 && !channelSwitching && (
            <div
              className="archived-entry"
              onClick={() => setShowArchived(true)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') setShowArchived(true); }}
            >
              <div className="archived-entry-icon">
                <Archive size={20} />
              </div>
              <div className="archived-entry-info">
                <span className="archived-entry-title">Archived</span>
                <span className="archived-entry-count">{archivedConversations.length} conversation{archivedConversations.length !== 1 ? 's' : ''}</span>
              </div>
            </div>
          )}

          {/* Archived view header with back button */}
          {showArchived && (
            <div className="archived-view-header">
              <IconButton
                size="small"
                onClick={() => setShowArchived(false)}
                className="archived-back-btn"
              >
                <ArrowLeft size={20} />
              </IconButton>
              <span className="archived-view-title">Archived</span>
              <span className="archived-view-count">{archivedConversations.length}</span>
            </div>
          )}

          {!channelSwitching && (
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
            {displayedConversations.map((member, index) => {
              const isSelected = selectedCustomer?.Id === member.Id;
              const isMenuOpen = Boolean(anchorEl) && menuMember?.Id === member.Id;
              const isKeyboardHighlighted = highlightedIndex === index;
              const shouldShowUnread = member.unreadCount > 0;
              const name = member.name || getCustomerDisplayName(member);

              const isDragOver = dragOverId === member.Id;

              return (
                <li
                  key={`${member.Id ?? 'id'}-${index}`}
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
                        <Tooltip title="Add to Customer" arrow>
                          <Avatar
                            {...getWhatsAppAvatarConfig(getCustomerAvatarSeed(member), 38)}
                            className="lead-avatar"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenAddCustomer(member);
                            }}
                          >
                            <UserPlus size={16} />
                          </Avatar>
                        </Tooltip>
                      ) : (
                        <Avatar {...member.avatarConfig} />
                      )}
                    </div>

                    <div className="member-info">
                      <div className="member-header">
                        <span className={shouldShowUnread ? 'member-name-unread' : 'member-name'}>
                          {name}
                          {!hasCustomerName(member) && (
                            <span className="lead-indicator-icon" title="Lead">
                              <Flag size={13} fill="#f59e0b" />
                            </span>
                          )}
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
                                  typeof member.lastMessage === 'string' ? (
                                    <WhatsAppText text={member.lastMessage} linkify={false} />
                                  ) : (
                                    member.lastMessage
                                  )
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
                                  className={`action-btn ${member?.IsStar === 1 ? 'is-star' : ''}`}
                                  onClick={(e) => { e.stopPropagation(); }}
                                >
                                  <Star size={17} fill="#facc15" color="#facc15" />
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
                                style={{ backgroundColor: tag.color || 'var(--primary-main)' }}
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
                <CircularProgress size={20} thickness={4} sx={{ color: 'var(--chat-primary, #25d366)' }} />
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Loading conversations...</span>
              </li>
            )}
          </ul>
          )}
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

      {/* Mobile channel picker dialog */}
      <Dialog
        open={channelDialogOpen}
        onClose={() => setChannelDialogOpen(false)}
        fullWidth
        maxWidth="xs"
        slotProps={{
          paper: { sx: { borderRadius: '16px', maxHeight: '70vh' } },
        }}
      >
        <DialogTitle sx={{ fontSize: '1rem', fontWeight: 700, pb: 1 }}>
          Select Channel
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {channelListLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
              <CircularProgress size={28} sx={{ color: 'var(--chat-primary, #25d366)' }} />
            </div>
          ) : (
            <List sx={{ pt: 0 }}>
              {channelList.map((ch) => {
                const isActive = ch.IsActive !== 0;
                const isSelected = channel?.Id === ch.Id;
                const cfg = getChannelAvatarConfig(ch, 40);
                const picUrl = ch?.ProfilePictureUrl || ch?.profilePictureUrl || '';
                return (
                  <ListItem
                    key={ch.Id}
                    button
                    disabled={!isActive}
                    onClick={() => handlePickChannel(ch)}
                    sx={{
                      py: 1.25,
                      bgcolor: isSelected ? 'var(--chat-primary-light, rgba(37, 211, 102, 0.12))' : 'transparent',
                      '&:hover': { bgcolor: isSelected ? 'var(--chat-primary-light, rgba(37, 211, 102, 0.18))' : 'action.hover' },
                    }}
                  >
                    <ListItemAvatar sx={{ minWidth: 48 }}>
                      {picUrl ? (
                        <Avatar
                          src={picUrl}
                          sx={{ width: 40, height: 40, bgcolor: cfg.bg }}
                          imgProps={{ onError: (e) => { e.target.style.display = 'none'; } }}
                        >
                          <span style={{ fontSize: 14, fontWeight: 700, color: cfg.fg }}>{cfg.initials}</span>
                        </Avatar>
                      ) : (
                        <Avatar sx={{ width: 40, height: 40, bgcolor: cfg.bg, fontSize: 14, fontWeight: 700 }}>
                          <span style={{ color: cfg.fg }}>{cfg.initials}</span>
                        </Avatar>
                      )}
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <span style={{ fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                          {getChannelDisplayName(ch)}
                          {isSelected && <Check size={16} style={{ color: 'var(--chat-primary, #25d366)' }} />}
                        </span>
                      }
                      secondary={
                        <span style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                          {getChannelSubName(ch) && (
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', opacity: 0.85, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {getChannelSubName(ch)}
                            </span>
                          )}
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                            {getChannelMobile(ch)}
                          </span>
                        </span>
                      }
                    />
                  </ListItem>
                );
              })}
              {!channelListLoading && channelList.length === 0 && (
                <ListItem>
                  <ListItemText
                    primary={<span style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No channels found</span>}
                  />
                </ListItem>
              )}
            </List>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default memo(ChatSidebar);
