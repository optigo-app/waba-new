'use client';

import { create } from 'zustand';
import {
  getCustomerDisplayName,
  getCustomerAvatarSeed,
  getWhatsAppAvatarConfig,
  getInteractiveReplyTitle,
  parseContactData,
  sortConversations,
} from '../components/Chat/utils/chatUtils';
import { formatChatTimestamp, nowAsServerIST } from '../components/Chat/utils/dateUtils';

/* ── helpers ── */
const normalizeMessage = (data) => ({
  ...data,
  id: data?.Id ?? data?.id ?? data?.autoid ?? data?.MessageId,
  Id: data?.Id ?? data?.id ?? data?.autoid ?? data?.MessageId,
  autoid: data?.autoid ?? data?.Id ?? data?.id,
  MessageId: data?.MessageId ?? data?.id ?? data?.Id,
  direction: data?.Direction ?? data?.direction ?? 0,
  Direction: data?.Direction ?? data?.direction ?? 0,
  type: data?.MessageType ?? data?.type ?? 'text',
  MessageType: data?.MessageType ?? data?.type ?? 'text',
  content: data?.Message ?? data?.content ?? data?.message ?? data?.text ?? '',
  Message: data?.Message ?? data?.content ?? data?.message ?? data?.text ?? '',
  sentAt: data?.DateTime ?? data?.sentAt ?? data?.sent_at ?? nowAsServerIST(),
  DateTime: data?.DateTime ?? data?.sentAt ?? data?.sent_at ?? nowAsServerIST(),
  status: data?.Status ?? data?.status ?? 1,
  Status: data?.Status ?? data?.status ?? 1,
});

const buildPreview = (msg) => {
  const type = msg?.MessageType;
  const text = type === 'text' ? (msg?.Message || '')
    : type === 'image' ? 'Photo'
      : type === 'video' ? 'Video'
        : type === 'document' ? 'Document'
          : type === 'file' ? 'File'
            : type === 'template' ? (msg?.Message ? `Template: ${msg.Message}` : 'Template')
              : type === 'contacts' || type === 'contact'
                ? (() => {
                    const c = parseContactData(msg);
                    const n = c.contacts?.length || 0;
                    return n > 1 ? `${n} contacts` : 'Contact';
                  })()
                : type === 'interactive' ? (getInteractiveReplyTitle(msg) || 'Interactive message')
                  : 'New message';
  return {
    lastMessage: text,
    lastMessageText: text,
    lastMessageTime: formatChatTimestamp(msg?.DateTime || nowAsServerIST()),
    lastMessageTimestamp: msg?.DateTime || nowAsServerIST(),
    lastMessageDirection: msg?.Direction ?? msg?.direction ?? 0,
    lastMessageStatus: msg?.Status ?? msg?.status,
  };
};

/* Merge an emoji into a message's ReactionEmojis JSON — one reaction per
   party (Direction): replace the existing entry, or remove when emoji is '' */
const mergeReactionEmojis = (raw, emoji, direction) => {
  let list = [];
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (Array.isArray(parsed)) list = parsed;
  } catch { /* ignore */ }
  const dir = Number(direction);
  list = list.filter((r) => Number(r?.Direction ?? r?.direction) !== dir);
  if (emoji) list.push({ Reaction: emoji, Direction: dir });
  return list.length ? JSON.stringify(list) : '';
};

/* Map a fn over every stored message matching any of targetIds — scoped to
   the emitted conversation when available, else across all loaded ones */
const updateMatchedMessages = (messagesByConversationId, conversationId, targetIds, mapFn) => {
  const keys =
    conversationId && Array.isArray(messagesByConversationId[conversationId])
      ? [conversationId]
      : Object.keys(messagesByConversationId);
  let changed = false;
  const next = { ...messagesByConversationId };
  for (const key of keys) {
    const list = next[key];
    if (!Array.isArray(list)) continue;
    let touched = false;
    const updated = list.map((m) => {
      const ids = [m?.id, m?.Id, m?.autoid, m?.MessageId]
        .filter((v) => v !== undefined && v !== null && v !== '')
        .map(String);
      if (!ids.some((x) => targetIds.includes(x))) return m;
      const mapped = mapFn(m);
      if (mapped !== m) {
        touched = true;
        changed = true;
      }
      return mapped;
    });
    if (touched) next[key] = updated;
  }
  return changed ? next : null;
};

/* ── store ── */
export const useChatStore = create((set, get) => ({
  /* state */
  conversations: [],
  allConversationsCache: [],
  conversationsByChannel: {},
  channels: [],
  channelsLoaded: false,
  selectedConversationId: null,
  selectedChannelId: null,
  selectedChannel: null,
  defaultChannelId: null,
  messagesByConversationId: {},
  pendingReadClears: {},
  templates: [],
  templatesLoaded: false,

  /* actions */
  setConversations: (conversations) =>
    set((s) => ({
      conversations:
        typeof conversations === 'function' ? conversations(s.conversations) : conversations,
    })),
  setAllConversationsCache: (allConversationsCache) =>
    set((s) => ({
      allConversationsCache:
        typeof allConversationsCache === 'function'
          ? allConversationsCache(s.allConversationsCache)
          : allConversationsCache,
    })),
  setConversationsByChannel: (channelId, conversations) =>
    set((s) => ({
      conversationsByChannel: {
        ...s.conversationsByChannel,
        [String(channelId)]:
          typeof conversations === 'function'
            ? conversations(s.conversationsByChannel[String(channelId)] || [])
            : conversations,
      },
    })),
  setSelectedConversationId: (selectedConversationId) => set({ selectedConversationId }),
  setSelectedChannelId: (selectedChannelId) => set({ selectedChannelId }),
  setSelectedChannel: (selectedChannel) => set({ selectedChannel }),
  setDefaultChannelId: (defaultChannelId) => set({ defaultChannelId }),
  setChannels: (channels) =>
    set((s) => ({
      channels:
        typeof channels === 'function' ? channels(s.channels) : channels,
    })),
  setChannelsLoaded: (loaded) => set({ channelsLoaded: loaded }),

  setTemplates: (templates) =>
    set((s) => ({
      templates:
        typeof templates === 'function' ? templates(s.templates) : templates,
    })),
  setTemplatesLoaded: (loaded) => set({ templatesLoaded: loaded }),

  setMessages: (conversationId, messages) =>
    set((s) => ({
      messagesByConversationId: {
        ...s.messagesByConversationId,
        [String(conversationId)]: messages,
      },
    })),

  appendMessages: (conversationId, messages) =>
    set((s) => {
      const key = String(conversationId);
      const existing = s.messagesByConversationId[key] || [];
      const existingIds = new Set(existing.map((m) => String(m.id ?? m.Id ?? m.autoid ?? m.MessageId)));
      const newItems = messages.filter((m) => {
        const id = String(m.id ?? m.Id ?? m.autoid ?? m.MessageId);
        return !existingIds.has(id);
      });
      return {
        messagesByConversationId: {
          ...s.messagesByConversationId,
          [key]: [...existing, ...newItems],
        },
      };
    }),

  updateMessage: (conversationId, msgId, updater) =>
    set((s) => {
      const key = String(conversationId);
      const list = s.messagesByConversationId[key] || [];
      const updated = list.map((m) => {
        const mId = String(m.id ?? m.Id ?? m.autoid ?? m.MessageId);
        if (mId === String(msgId)) {
          return typeof updater === 'function' ? updater(m) : { ...m, ...updater };
        }
        return m;
      });
      return {
        messagesByConversationId: {
          ...s.messagesByConversationId,
          [key]: updated,
        },
      };
    }),

  setMessagesFn: (conversationId, fn) =>
    set((s) => {
      const key = String(conversationId);
      const current = s.messagesByConversationId[key] || [];
      const next = fn(current);
      return {
        messagesByConversationId: {
          ...s.messagesByConversationId,
          [key]: next,
        },
      };
    }),

  clearConversationUnread: (conversationId) =>
    set((s) => {
      const cid = String(conversationId);
      let cleared = 0;
      const clear = (list) =>
        list.map((c) => {
          const cId = String(c?.ConversationId ?? c?.Id ?? c?.CustomerId);
          if (cId === cid) {
            cleared = Math.max(cleared, Number(c?.unreadCount ?? c?.UnReadMsgCount ?? 0) || 0);
            return { ...c, unreadCount: 0, UnReadMsgCount: 0 };
          }
          return c;
        });

      // Resolve which channel this conversation belongs to — don't assume the
      // selected channel (a read can land before a channel switch completes)
      let channelKey = String(s.selectedChannelId ?? '');
      for (const [key, list] of Object.entries(s.conversationsByChannel || {})) {
        if (Array.isArray(list) && list.some((c) => String(c?.ConversationId ?? c?.Id ?? c?.CustomerId) === cid)) {
          channelKey = key;
          break;
        }
      }

      const channels = cleared > 0
        ? s.channels.map((ch) =>
            String(ch?.Id) === channelKey
              ? { ...ch, UnreadMessageCount: Math.max(0, (Number(ch?.UnreadMessageCount) || 0) - cleared) }
              : ch
          )
        : s.channels;
      // Record only what actually landed on a channel badge — if the channel
      // list wasn't loaded yet, the read API's msgCount must apply in full later
      const applied = cleared > 0 && s.channels.some((ch) => String(ch?.Id) === channelKey)
        ? cleared
        : 0;
      const conversationsByChannel = Object.fromEntries(
        Object.entries(s.conversationsByChannel || {}).map(([key, list]) => [key, clear(list)])
      );
      return {
        conversations: clear(s.conversations),
        allConversationsCache: clear(s.allConversationsCache),
        conversationsByChannel,
        channels,
        pendingReadClears: { ...s.pendingReadClears, [cid]: applied },
      };
    }),

  applyChannelReadCount: (accountId, msgCount, conversationId) =>
    set((s) => {
      const cid = String(conversationId ?? '');
      const already = cid ? (s.pendingReadClears?.[cid] ?? 0) : 0;
      const rest = { ...s.pendingReadClears };
      if (cid) delete rest[cid];
      const extra = (Number(msgCount) || 0) - already;

      const channelKey = String(accountId ?? s.selectedChannelId ?? '');
      const match = s.channels.find((ch) =>
        String(ch?.Id ?? ch?.AccountId ?? ch?.ChannelId ?? '') === channelKey
      );
      console.log('[chat] applyChannelReadCount', { accountId, msgCount, already, extra, channelKey, matched: match?.Id, channelIds: s.channels.map((c) => c?.Id) });
      if (!match) return {};
      if (extra === 0 || !channelKey) return { pendingReadClears: rest };

      return {
        pendingReadClears: rest,
        channels: s.channels.map((ch) =>
          String(ch?.Id ?? ch?.AccountId ?? ch?.ChannelId ?? '') === channelKey
            ? { ...ch, UnreadMessageCount: Math.max(0, (Number(ch?.UnreadMessageCount) || 0) - extra) }
            : ch
        ),
      };
    }),

  /* Push a just-sent (optimistic) message into the conversation list preview —
     sidebar shows it instantly; socket emit/API then update it in realtime */
  pushOutgoingToConversation: (conversationId, data) =>
    set((s) => {
      const cid = String(conversationId);
      const preview = buildPreview(data);
      const bump = (list) =>
        sortConversations(
          list.map((c) => {
            const cId = String(c?.ConversationId ?? c?.Id ?? c?.CustomerId);
            return cId === cid ? { ...c, ...preview } : c;
          })
        );
      const conversationsByChannel = Object.fromEntries(
        Object.entries(s.conversationsByChannel || {}).map(([key, l]) => [key, bump(l)])
      );
      return {
        conversations: bump(s.conversations),
        allConversationsCache: bump(s.allConversationsCache),
        conversationsByChannel,
      };
    }),

  /* socket handlers */
  handleSocketMessage: (data) => {
    /* Reaction payloads are not chat messages — attach the emoji to the
       target message instead of appending a phantom bubble / bumping unread */
    const msgType = String(data?.MessageType ?? data?.type ?? '').toLowerCase();
    if (msgType === 'reaction') {
      get().handleSocketReaction(data);
      return;
    }

    const state = get();
    const msgConversationId = String(
      data?.ConversationId ?? data?.conversationId ?? data?.customerId ?? data?.autoid
    );
    if (!msgConversationId || msgConversationId === 'undefined') return;

    const normalized = normalizeMessage(data);

    const emitChannelId = String(data?.ChannelId ?? data?.channelId ?? '');
    const selectedKey = String(state.selectedChannelId ?? '');
    // Only trust the emit's channel id when it matches a known channel —
    // payloads (e.g. outgoing sendMessage echoes) may carry AccountId or an
    // empty value, which is not the channel and must fall back to selected
    const knownChannelIds = new Set(
      (state.channels || []).map((ch) => String(ch?.Id ?? ch?.ChannelId ?? ''))
    );
    const emitIsKnownChannel =
      emitChannelId !== '' &&
      (knownChannelIds.size === 0 || knownChannelIds.has(emitChannelId));
    const targetChannelKey = emitIsKnownChannel ? emitChannelId : selectedKey;
    const isSelectedChannel = targetChannelKey === selectedKey;
    /* The open conversation matches on its id alone — backend echoes (e.g.
       sendMessage for a template sent server-side) may carry an AccountId or
       unrelated ChannelId, which must not silently drop the message. Emits
       that explicitly name a different known channel are still excluded so a
       same-id conversation on another channel never receives it. */
    const emitForOtherChannel = emitIsKnownChannel && emitChannelId !== selectedKey;
    const isSelected = !emitForOtherChannel && String(state.selectedConversationId) === msgConversationId;
    const isOutgoing = Number(normalized.direction) === 1;
    /* IsRead: 1 marks a re-emit of an already-read message (e.g. reaction
       add/remove re-broadcasts the full row) — never bump unread for it */
    const unreadDelta = isSelected || isOutgoing || Number(data?.IsRead) === 1 ? 0 : 1;

    /* Batch all updates into a single set() to avoid double re-renders. */
    set((s) => {
      const next = {};

      /* 1. update messages if conversation is open */
      if (isSelected) {
        const existing = s.messagesByConversationId[msgConversationId] || [];
        const msgId = String(normalized.id);
        const msgMessageId = String(normalized.MessageId);
        const exists = existing.some(
          (m) => {
            const mId = String(m.id ?? m.Id ?? m.autoid ?? m.MessageId);
            return mId === msgId || mId === msgMessageId;
          }
        );

        if (!exists) {
          // Race-condition guard: socket may arrive before API updates tempId → wamid
          const hasRecentOptimistic = existing.some((m) => {
            const mId = String(m.id ?? '');
            if (!mId.startsWith('temp-')) return false;
            const mContent = String(m.content || m.message || m.Message || '');
            const sContent = String(normalized.content || normalized.message || normalized.Message || '');
            if (mContent !== sContent) return false;
            return (m.direction ?? m.Direction ?? 0) === (normalized.direction ?? normalized.Direction ?? 0);
          });

          if (!hasRecentOptimistic) {
            next.messagesByConversationId = {
              ...s.messagesByConversationId,
              [msgConversationId]: [...existing, normalized],
            };
          }
        }
      }

      /* 1b. Reaction add/remove re-emits the full message row (MessageType
             stays 'text') with updated ReactionEmojis — sync the authoritative
             value onto the stored message, since the append path skips it */
      const incomingReactions = data?.ReactionEmojis ?? data?.reactionEmojis;
      if (incomingReactions !== undefined) {
        const ids = [normalized.id, normalized.MessageId]
          .filter((v) => v !== undefined && v !== null && v !== '')
          .map(String);
        const synced = updateMatchedMessages(
          next.messagesByConversationId || s.messagesByConversationId,
          msgConversationId,
          ids,
          (m) =>
            String(m?.ReactionEmojis ?? m?.reactionEmojis ?? '') === String(incomingReactions)
              ? m
              : { ...m, ReactionEmojis: incomingReactions, reactionEmojis: incomingReactions }
        );
        if (synced) next.messagesByConversationId = synced;
      }

      /* 2. upsert into a conversation list — update preview, bump unread,
            re-sort WhatsApp-style: pinned first, then latest timestamp */
      const sortByLatest = sortConversations;

      const upsertConvList = (list) => {
        const idx = list.findIndex((c) => {
          const cid = String(c?.ConversationId ?? c?.Id ?? c?.CustomerId);
          return cid === msgConversationId;
        });

        if (idx !== -1) {
          const conv = { ...list[idx], ...buildPreview(data) };
          conv.unreadCount = isSelected ? 0 : (conv.unreadCount || 0) + unreadDelta;
          conv.UnReadMsgCount = conv.unreadCount;
          return sortByLatest([conv, ...list.filter((_, i) => i !== idx)]);
        }

        /* new conversation from socket — create minimal record */
        const rawConv = {
          Id: msgConversationId,
          ConversationId: msgConversationId,
          CustomerId: msgConversationId,
          CustomerPhone: data?.Sender || '',
          CustomerName: '',
          WhatsappCustName: data.WhatsappCustName ?? '',
          IsPin: 0,
          IsStar: 0,
          IsArchived: 0,
          UnReadMsgCount: unreadDelta,
          LastMessage: data,
          DateTime: normalized.DateTime,
          TagList: null,
        };

        const enriched = {
          ...rawConv,
          ...buildPreview(data),
          name: getCustomerDisplayName(rawConv),
          avatar: null,
          avatarConfig: getWhatsAppAvatarConfig(getCustomerAvatarSeed(rawConv), 38),
          unreadCount: unreadDelta,
          tags: [],
          ticketStatus: null,
        };

        return sortByLatest([enriched, ...list]);
      };

      /* Visible list + global cache belong to the selected channel only */
      if (isSelectedChannel) {
        next.conversations = upsertConvList(s.conversations);
        next.allConversationsCache = upsertConvList(s.allConversationsCache);
      }

      /* Per-channel cache — update it if that channel was loaded before */
      if (targetChannelKey && s.conversationsByChannel?.[targetChannelKey]) {
        next.conversationsByChannel = {
          ...s.conversationsByChannel,
          [targetChannelKey]: upsertConvList(s.conversationsByChannel[targetChannelKey]),
        };
      }

      /* 3. channel badge — bump UnreadMessageCount on the emit's channel */
      if (unreadDelta > 0 && targetChannelKey) {
        next.channels = s.channels.map((ch) =>
          String(ch?.Id) === targetChannelKey
            ? { ...ch, UnreadMessageCount: (Number(ch?.UnreadMessageCount) || 0) + unreadDelta }
            : ch
        );
      }

      return next;
    });

    // Signal that the open conversation received a message and should be marked read on backend
    if (isSelected && typeof window !== 'undefined') {
      try {
        window.dispatchEvent(
          new CustomEvent('waba:markConversationRead', { detail: { conversationId: msgConversationId, messageId: normalized?.MessageId || normalized?.id || '' } })
        );
      } catch (_) { /* ignore */ }
    }
  },

  handleSocketStatusChange: (data) => {
    const conversationId = String(
      data?.ConversationId ?? data?.conversationId
    );
    if (!conversationId || conversationId === 'undefined') return;

    const targetId = String(data?.Id ?? data?.id ?? data?.autoid ?? '');
    const targetMessageId = String(data?.MessageId ?? '');
    const newStatus = data?.Status ?? data?.status;
    if (newStatus === undefined) return;

    set((s) => {
      const list = s.messagesByConversationId[conversationId] || [];
      const updated = list.map((m) => {
        const ids = [m.id, m.Id, m.autoid, m.MessageId].filter((v) => v !== undefined && v !== null).map(String);
        if (ids.includes(targetId) || ids.includes(targetMessageId)) {
          const currentStatus = m?.Status ?? m?.status;
          if (currentStatus === newStatus) return m;
          return { ...m, status: newStatus, Status: newStatus };
        }
        return m;
      });

      /* Also sync the conversation-list preview status in realtime —
         only when the emitted message is that conversation's latest */
      const isLastMessage = (() => {
        if (updated.length === 0) return true;
        const last = updated[updated.length - 1];
        const ids = [last?.id, last?.Id, last?.autoid, last?.MessageId].filter((v) => v !== undefined && v !== null).map(String);
        return ids.includes(targetId) || ids.includes(targetMessageId);
      })();

      const updateConvStatus = (l) =>
        l.map((c) => {
          const cid = String(c?.ConversationId ?? c?.Id ?? c?.CustomerId);
          if (cid !== conversationId || c?.lastMessageStatus === newStatus) return c;
          if (!isLastMessage) return c;
          if (typeof c?.lastMessageStatus === 'number' && typeof newStatus === 'number' && newStatus < c.lastMessageStatus) return c;
          return { ...c, lastMessageStatus: newStatus };
        });

      const conversationsByChannel = Object.fromEntries(
        Object.entries(s.conversationsByChannel || {}).map(([key, l]) => [key, updateConvStatus(l)])
      );

      return {
        messagesByConversationId: {
          ...s.messagesByConversationId,
          [conversationId]: updated,
        },
        conversations: updateConvStatus(s.conversations),
        allConversationsCache: updateConvStatus(s.allConversationsCache),
        conversationsByChannel,
      };
    });
  },

  /* Apply a realtime reaction onto the target message's ReactionEmojis —
     matches by any known message id (DB Id, autoid, wamid) and tolerates
     whatever key casing the emit carries. A payload carrying the full
     ReactionEmojis list is written verbatim (server's authoritative state) */
  handleSocketReaction: (data) => {
    if (!data) return;
    const targetIds = [
      data?.MessageId,
      data?.messageId,
      data?.MsgId,
      data?.Id,
      data?.id,
      data?.autoid,
      data?.reaction?.message_id,
      data?.ReactionMessageId,
    ]
      .filter((v) => v !== undefined && v !== null && v !== '')
      .map(String);
    if (targetIds.length === 0) return;

    const conversationId = String(
      data?.ConversationId ?? data?.conversationId ?? data?.customerId ?? ''
    );
    const fullReactions = data?.ReactionEmojis ?? data?.reactionEmojis;
    const emoji =
      data?.emoji ?? data?.Emoji ?? data?.Reaction ?? data?.reaction?.emoji ?? data?.ReactionEmoji ?? '';
    const direction = data?.Direction ?? data?.direction ?? 1;

    set((s) => {
      const next =
        fullReactions !== undefined
          ? updateMatchedMessages(s.messagesByConversationId, conversationId, targetIds, (m) =>
              String(m?.ReactionEmojis ?? m?.reactionEmojis ?? '') === String(fullReactions)
                ? m
                : { ...m, ReactionEmojis: fullReactions, reactionEmojis: fullReactions }
            )
          : updateMatchedMessages(s.messagesByConversationId, conversationId, targetIds, (m) => {
              const merged = mergeReactionEmojis(m?.ReactionEmojis ?? m?.reactionEmojis, emoji, direction);
              return { ...m, ReactionEmojis: merged, reactionEmojis: merged };
            });
      return next ? { messagesByConversationId: next } : {};
    });
  },
}));
