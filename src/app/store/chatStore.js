'use client';

import { create } from 'zustand';
import {
  getMessagePreview,
  getCustomerDisplayName,
  getCustomerAvatarSeed,
  getWhatsAppAvatarConfig,
} from '../components/Chat/utils/chatUtils';
import { formatChatTimestamp } from '../components/Chat/utils/dateUtils';

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
  sentAt: data?.DateTime ?? data?.sentAt ?? data?.sent_at ?? new Date().toISOString(),
  DateTime: data?.DateTime ?? data?.sentAt ?? data?.sent_at ?? new Date().toISOString(),
  status: data?.Status ?? data?.status ?? 1,
  Status: data?.Status ?? data?.status ?? 1,
});

const buildPreview = (msg) => {
  const preview = getMessagePreview(msg);
  return {
    lastMessage: preview.node,
    lastMessageText: preview.text,
    lastMessageTime: formatChatTimestamp(msg?.DateTime || new Date().toISOString()),
    lastMessageTimestamp: msg?.DateTime || new Date().toISOString(),
    lastMessageDirection: msg?.Direction ?? msg?.direction ?? 0,
    lastMessageStatus: msg?.Status ?? msg?.status,
  };
};

/* ── store ── */
export const useChatStore = create((set, get) => ({
  /* state */
  conversations: [],
  allConversationsCache: [],
  selectedConversationId: null,
  messagesByConversationId: {},

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
  setSelectedConversationId: (selectedConversationId) => set({ selectedConversationId }),

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
      const clear = (list) =>
        list.map((c) => {
          const cId = String(c?.ConversationId ?? c?.Id ?? c?.CustomerId);
          if (cId === cid) {
            return { ...c, unreadCount: 0, UnReadMsgCount: 0 };
          }
          return c;
        });
      return {
        conversations: clear(s.conversations),
        allConversationsCache: clear(s.allConversationsCache),
      };
    }),

  /* socket handlers */
  handleSocketMessage: (data) => {
    const state = get();
    const msgConversationId = String(
      data?.ConversationId ?? data?.conversationId ?? data?.customerId ?? data?.autoid
    );
    if (!msgConversationId || msgConversationId === 'undefined') return;

    const normalized = normalizeMessage(data);
    const isSelected = String(state.selectedConversationId) === msgConversationId;

    /* 1. update messages if conversation is open */
    if (isSelected) {
      set((s) => {
        const existing = s.messagesByConversationId[msgConversationId] || [];
        const msgId = String(normalized.id);
        const exists = existing.some(
          (m) => String(m.id ?? m.Id ?? m.autoid ?? m.MessageId) === msgId
        );
        if (exists) return {};
        return {
          messagesByConversationId: {
            ...s.messagesByConversationId,
            [msgConversationId]: [...existing, normalized],
          },
        };
      });
      // Signal that the open conversation received a message and should be marked read on backend
      if (typeof window !== 'undefined') {
        try {
          window.dispatchEvent(
            new CustomEvent('waba:markConversationRead', { detail: { conversationId: msgConversationId } })
          );
        } catch (_) { /* ignore */ }
      }
    }

    /* 2. update conversation list */
    set((s) => {
      const idx = s.conversations.findIndex((c) => {
        const cid = String(c?.ConversationId ?? c?.Id ?? c?.CustomerId);
        return cid === msgConversationId;
      });

      if (idx !== -1) {
        /* existing conversation — update preview & unread */
        const updated = [...s.conversations];
        const conv = { ...updated[idx] };
        const preview = buildPreview(data);

        Object.assign(conv, preview);

        if (isSelected) {
          conv.unreadCount = 0;
        } else {
          conv.unreadCount = (conv.unreadCount || 0) + 1;
        }

        updated.splice(idx, 1);
        updated.unshift(conv);

        /* mirror in cache */
        const cacheIdx = s.allConversationsCache.findIndex((c) => {
          const cid = String(c?.ConversationId ?? c?.Id ?? c?.CustomerId);
          return cid === msgConversationId;
        });
        const updatedCache =
          cacheIdx !== -1
            ? s.allConversationsCache.map((c, i) => (i === cacheIdx ? conv : c))
            : [...s.allConversationsCache];
        if (cacheIdx !== -1) {
          const item = updatedCache[cacheIdx];
          updatedCache.splice(cacheIdx, 1);
          updatedCache.unshift(item);
        }

        return { conversations: updated, allConversationsCache: updatedCache };
      }

      /* new conversation from socket — create minimal record */
      const rawConv = {
        Id: msgConversationId,
        ConversationId: msgConversationId,
        CustomerId: msgConversationId,
        CustomerPhone: data?.Sender || '',
        CustomerName: '',
        WhatsappCustName: '',
        IsPin: 0,
        IsStar: 0,
        IsArchived: 0,
        UnReadMsgCount: isSelected ? 0 : 1,
        LastMessage: data,
        DateTime: normalized.DateTime,
        TagList: null,
      };

      const preview = buildPreview(data);
      const enriched = {
        ...rawConv,
        ...preview,
        name: getCustomerDisplayName(rawConv),
        avatar: null,
        avatarConfig: getWhatsAppAvatarConfig(getCustomerAvatarSeed(rawConv), 38),
        unreadCount: isSelected ? 0 : 1,
        tags: [],
        ticketStatus: null,
      };

      return {
        conversations: [enriched, ...s.conversations],
        allConversationsCache: [enriched, ...s.allConversationsCache],
      };
    });
  },

  handleSocketReaction: (data) => {
    /* placeholder — reactions are handled locally in ChatConversation for now */
  },
}));
