'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, MessageCircle, Smartphone, CheckCircle2, PanelLeft, MessageSquare } from 'lucide-react';
import { CircularProgress, Tooltip, IconButton, Popover, Box } from '@mui/material';
import { fetchChannels } from '../../api/chat/conversationApi';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';
import { getChannelAvatarConfig, getChannelDisplayName, getChannelMobile, getChannelSubName } from './utils/chatUtils';
import ChatPanelHeader from './ChatPanelHeader';
import AddChannelPromo from './AddChannelPromo';
import ProfileMenu from './ui/ProfileMenu';
import toast from 'react-hot-toast';

export default function ChatChannelPanel({ onChannelSelect, selectedChannel, collapsed, onToggleCollapse }) {
  const auth = useAuthStore((s) => s.auth);
  const userId = auth?.userId || auth?.userid || auth?.appuserid || '';

  // Read preloaded channels from the store (set by ChatPreloader)
  const storeChannels = useChatStore((s) => s.channels);
  const storeChannelsLoaded = useChatStore((s) => s.channelsLoaded);

  // Initialize from store directly — avoids blank screen after preloader hides
  const [channels, setChannels] = useState(() => useChatStore.getState().channels || []);
  const [loading, setLoading] = useState(() => {
    const s = useChatStore.getState();
    return !s.channelsLoaded || (s.channels || []).length === 0;
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hoveredChannel, setHoveredChannel] = useState(null);
  const [hoverAnchor, setHoverAnchor] = useState(null);
  const [imgErrors, setImgErrors] = useState({});
  const fetchedRef = useRef(false);
  const searchedRef = useRef(false);
  const skipSearchInitRef = useRef(true);
  // If channels were preloaded in the store, mark as already fetched
  if (!fetchedRef.current && storeChannelsLoaded && storeChannels.length > 0) {
    fetchedRef.current = true;
  }
  const listRef = useRef(null);
  const searchTimerRef = useRef(null);

  const markImgError = useCallback((channelId) => {
    setImgErrors((prev) => (prev[channelId] ? prev : { ...prev, [channelId]: true }));
  }, []);

  const getChannelAvatar = useCallback((channel, size = 42) => {
    const url = channel?.ChannelImage || channel?.channelImage || channel?.ProfilePictureUrl || channel?.profilePictureUrl || '';
    const hasImg = Boolean(url) && !imgErrors[channel?.Id];
    const config = getChannelAvatarConfig(channel, size);
    return { url, hasImg, initials: config.initials, bg: config.bg, fg: config.fg };
  }, [imgErrors]);

  // Sync from store if preloaded channels arrive after mount
  useEffect(() => {
    if (storeChannelsLoaded && storeChannels.length > 0 && !fetchedRef.current && !searchTerm.trim()) {
      setChannels(storeChannels);
      setHasMore(storeChannels.length >= 20);
      setPage(1);
      fetchedRef.current = true;
      setLoading(false);
    }
  }, [storeChannelsLoaded, storeChannels]);

  // Keep local unread badges in sync when store channel counts change
  // (e.g. a conversation was actually read → badge decrements)
  useEffect(() => {
    if (!storeChannels || storeChannels.length === 0) return;
    const unreadById = new Map(storeChannels.map((c) => [String(c?.Id), c?.UnreadMessageCount]));
    setChannels((prev) => {
      let changed = false;
      const next = prev.map((c) => {
        const unread = unreadById.get(String(c?.Id));
        if (unread !== undefined && unread !== c?.UnreadMessageCount) {
          changed = true;
          return { ...c, UnreadMessageCount: unread };
        }
        return c;
      });
      return changed ? next : prev;
    });
  }, [storeChannels]);

  const loadChannels = useCallback(async (targetPage = 1, append = false, search = '') => {
    if (!userId) return;
    const isSearch = Boolean(search);
    // Skip initial fetch if channels are already preloaded from the store —
    // but never skip when clearing a previous search (the list must reset)
    if (targetPage === 1 && !append && !isSearch && !searchedRef.current && fetchedRef.current) return;
    if (targetPage === 1) setLoading(true);
    else setIsLoadingMore(true);

    try {
      const response = await fetchChannels(userId, null, targetPage, 20, search);
      const list = response?.data || [];

      if (append) {
        setChannels((prev) => {
          const existingIds = new Set(prev.map((c) => c.Id));
          const newItems = list.filter((c) => !existingIds.has(c.Id));
          return [...prev, ...newItems];
        });
      } else {
        setChannels(list);
        fetchedRef.current = true;
        // Only cache the full unfiltered list — search results must not
        // overwrite the preloaded channel cache
        if (!isSearch) {
          useChatStore.getState().setChannels(list);
          useChatStore.getState().setChannelsLoaded(true);
        }
      }
      searchedRef.current = isSearch;
      setHasMore(response?.hasMore ?? false);
      setPage(targetPage);
    } catch (err) {
      console.error('Failed to load channels:', err);
      toast.error('Failed to load WhatsApp channels');
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  }, [userId]);

  useEffect(() => {
    // Only fetch if not already preloaded from store
    if (!fetchedRef.current) loadChannels();
  }, [loadChannels]);

  // Debounced server-side search (skip first run — mount effect handles it)
  useEffect(() => {
    if (!userId) return;
    if (skipSearchInitRef.current) {
      skipSearchInitRef.current = false;
      return;
    }
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      loadChannels(1, false, searchTerm.trim());
    }, 400);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [searchTerm, userId, loadChannels]);

  // Auto-select the default channel when none is selected
  useEffect(() => {
    if (!selectedChannel && channels.length > 0) {
      const defaultId = useChatStore.getState().defaultChannelId;
      const defaultCh =
        channels.find((c) => String(c.Id) === String(defaultId)) ||
        channels.find((c) => Number(c.IsDefault) === 1) ||
        channels.find((c) => c.IsActive !== 0) ||
        channels[0];
      onChannelSelect?.(defaultCh);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channels, selectedChannel]);

  // Select a channel — keep its unread badge as-is; it should only drop when
  // conversations are actually read (server/socket updates), not on selection.
  const handleSelect = useCallback((channel) => {
    if (!channel || channel.IsActive === 0) return;
    onChannelSelect?.(channel);
  }, [onChannelSelect]);

  return (
    <div className={`channel-panel${collapsed ? ' channel-panel-collapsed' : ''}`}>
      <ChatPanelHeader
        icon={MessageCircle}
        title="Waba Chat"
        onIconClick={collapsed ? onToggleCollapse : undefined}
        right={
          !collapsed && (
            <Tooltip title="Collapse channels" placement="right" arrow>
              <IconButton
                size="small"
                onClick={onToggleCollapse}
                className="channel-collapse-btn"
              >
                <PanelLeft size={18} />
              </IconButton>
            </Tooltip>
          )
        }
      />

      {!collapsed && (
        <>
          <div className="channel-panel-search-wrap">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search channels…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="channel-panel-search"
            />
          </div>

          {loading ? (
            <div className="channel-panel-loading">
              <CircularProgress size={24} sx={{ color: 'var(--chat-primary, #25d366)' }} />
              <span>Loading channels…</span>
            </div>
          ) : (
            <ul
              className="channel-list"
              ref={listRef}
              onScroll={() => {
                const el = listRef.current;
                if (!el || isLoadingMore || !hasMore || loading) return;
                const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= 5;
                if (atBottom) {
                  loadChannels(page + 1, true, searchTerm.trim());
                }
              }}
            >
              {channels.map((channel) => {
                const isActive = channel.IsActive !== 0;
                const isSelected = selectedChannel?.Id === channel.Id;
                const unreadCount = Number(channel.UnreadMessageCount) || 0;
                const avatar = getChannelAvatar(channel);
                return (
                  <li
                    key={channel.Id}
                    className={`channel-item${isActive ? '' : ' channel-item-inactive'}${isSelected ? ' channel-item-selected' : ''}`}
                    onClick={() => handleSelect(channel)}
                    role="button"
                    tabIndex={isActive ? 0 : -1}
                    onKeyDown={(e) => { if (e.key === 'Enter' && isActive) handleSelect(channel); }}
                    aria-disabled={!isActive}
                  >
                    <div className="channel-avatar">
                      {avatar.hasImg ? (
                        <img
                          src={avatar.url}
                          alt={getChannelDisplayName(channel)}
                          className="channel-avatar-img"
                          onError={() => markImgError(channel.Id)}
                        />
                      ) : (
                        <span
                          className="channel-avatar-letter"
                          style={{ background: avatar.bg, color: avatar.fg }}
                        >
                          {avatar.initials}
                        </span>
                      )}
                      {channel.IsOfficialAccount === 1 && (
                        <span className="channel-verified" title="Official account">
                          <CheckCircle2 size={12} />
                        </span>
                      )}
                    </div>
                    <div className="channel-info" title={getChannelDisplayName(channel)}>
                      <div className="channel-name" >
                        {getChannelDisplayName(channel)}
                      </div>
                      {getChannelSubName(channel) && (
                        <div className="channel-subname">{getChannelSubName(channel)}</div>
                      )}
                      <div className="channel-meta">
                        <Smartphone size={12} />
                        <span>{getChannelMobile(channel)}</span>
                      </div>
                    </div>
                    {unreadCount > 0 && (
                      <div className="channel-right">
                        <span className="channel-unread-badge" title="Unread messages">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      </div>
                    )}
                  </li>
                );
              })}
              {!channels.length && (
                <li className="channel-empty">
                  {searchTerm ? 'No channels match your search' : 'No WhatsApp channels found'}
                </li>
              )}
              {isLoadingMore && (
                <li className="channel-loading-more">
                  <CircularProgress size={18} sx={{ color: 'var(--chat-primary, #25d366)' }} />
                </li>
              )}
            </ul>
          )}
        </>
      )}

      {collapsed && (
        <ul className="channel-list-mini">
          {channels.map((channel) => {
            const isActive = channel.IsActive !== 0;
            const isSelected = selectedChannel?.Id === channel.Id;
            const unreadCount = Number(channel.UnreadMessageCount) || 0;
            const avatar = getChannelAvatar(channel);
            return (
              <li
                key={channel.Id}
                className={`channel-item-mini${isActive ? '' : ' channel-item-inactive'}${isSelected ? ' channel-item-selected' : ''}`}
                onClick={() => handleSelect(channel)}
                role="button"
                tabIndex={isActive ? 0 : -1}
                onMouseEnter={(e) => { setHoverAnchor(e.currentTarget); setHoveredChannel(channel); }}
                onMouseLeave={() => { setHoverAnchor(null); setHoveredChannel(null); }}
              >
                <div className="channel-mini-avatar">
                  {avatar.hasImg ? (
                    <img
                      src={avatar.url}
                      alt={getChannelDisplayName(channel)}
                      className="channel-mini-avatar-img"
                      onError={() => markImgError(channel.Id)}
                    />
                  ) : (
                    <span
                      className="channel-mini-avatar-letter"
                      style={{ background: avatar.bg, color: avatar.fg }}
                    >
                      {avatar.initials}
                    </span>
                  )}
                  {unreadCount > 0 && (
                    <span className="channel-mini-badge">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Hover popover for mini mode — shows channel details */}
      <Popover
        open={Boolean(hoverAnchor) && collapsed}
        anchorEl={hoverAnchor}
        onClose={() => { setHoverAnchor(null); setHoveredChannel(null); }}
        anchorOrigin={{ vertical: 'center', horizontal: 'right' }}
        transformOrigin={{ vertical: 'center', horizontal: 'left' }}
        disableRestoreFocus
        disableAutoFocus
        slotProps={{
          paper: {
            sx: {
              pointerEvents: 'none',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.14)',
              borderRadius: '14px',
              border: '1px solid var(--sidebar-borderColor, var(--border-color))',
              bgcolor: 'var(--bg-paper)',
              ml: 2.5,
              overflow: 'hidden',
            },
          },
        }}
        sx={{ pointerEvents: 'none' }}
      >
        {hoveredChannel && (
          <div className="channel-mini-popover">
            <div className="channel-mini-popover-header">
              {(() => {
                const avatar = getChannelAvatar(hoveredChannel, 32);
                return avatar.hasImg ? (
                  <img
                    src={avatar.url}
                    alt={getChannelDisplayName(hoveredChannel)}
                    className="channel-mini-popover-avatar-img"
                    onError={() => markImgError(hoveredChannel.Id)}
                  />
                ) : (
                  <span
                    className="channel-mini-popover-avatar"
                    style={{ background: avatar.bg, color: avatar.fg }}
                  >
                    {avatar.initials}
                  </span>
                );
              })()}
              <div className="channel-mini-popover-info">
                <span className="channel-mini-popover-name">
                  {getChannelDisplayName(hoveredChannel)}
                </span>
                {getChannelSubName(hoveredChannel) && (
                  <span className="channel-mini-popover-subname">{getChannelSubName(hoveredChannel)}</span>
                )}
                <span className="channel-mini-popover-meta">
                  <Smartphone size={11} />
                  {getChannelMobile(hoveredChannel)}
                </span>
              </div>
            </div>
            <div className="channel-mini-popover-stats">
              <div className="channel-mini-popover-stat">
                <MessageSquare size={13} />
                <span>{Number(hoveredChannel.ConversationCount) || 0} conversations</span>
              </div>
              {Number(hoveredChannel.UnreadMessageCount) > 0 && (
                <div className="channel-mini-popover-stat channel-mini-popover-stat-unread">
                  <MessageCircle size={13} />
                  <span>{Number(hoveredChannel.UnreadMessageCount)} unread</span>
                </div>
              )}
            </div>
          </div>
        )}
      </Popover>

      {/* Upsell card — shown when the account has 1–2 channels */}
      {!loading && !searchTerm.trim() && channels.length <= 2 && (
        <Box sx={{ mx: 1.4 }} >
          <AddChannelPromo collapsed={collapsed} />
        </Box>
      )}

      {/* Profile menu at the bottom */}
      <div className="channel-panel-footer">
        <ProfileMenu variant="sidebar" collapsed={collapsed} />
      </div>
    </div>
  );
}
