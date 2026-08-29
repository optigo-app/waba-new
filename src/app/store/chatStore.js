'use client';

import { create } from 'zustand';
import {
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
  const type = msg?.MessageType;
  const text = type === 'text' ? (msg?.Message || '')
    : type === 'image' ? 'Photo'
      : type === 'video' ? 'Video'
        : type === 'document' ? 'Document'
          : type === 'file' ? 'File'
            : type === 'template' ? (msg?.Message ? `Template: ${msg.Message}` : 'Template')
              : 'New message';
  return {
    lastMessage: text,
    lastMessageText: text,
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
  conversationsByChannel: {},
  selectedConversationId: null,
  selectedChannelId: null,
  selectedChannel: null,
  defaultChannelId: null,
  messagesByConversationId: {},
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

    /* Batch both updates (messages + conversation list) into a single set()
       to avoid double re-renders on every incoming socket message. */
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

      /* 2. update conversation list */
      const idx = s.conversations.findIndex((c) => {
        const cid = String(c?.ConversationId ?? c?.Id ?? c?.CustomerId);
        return cid === msgConversationId;
      });

      if (idx !== -1) {
        /* existing conversation — update preview & unread */
        const conv = { ...s.conversations[idx], ...buildPreview(data) };
        conv.unreadCount = isSelected ? 0 : (conv.unreadCount || 0) + 1;

        // Move to top without splice/unshift (cheaper)
        const updated = [conv, ...s.conversations.filter((_, i) => i !== idx)];

        /* mirror in cache */
        const cacheIdx = s.allConversationsCache.findIndex((c) => {
          const cid = String(c?.ConversationId ?? c?.Id ?? c?.CustomerId);
          return cid === msgConversationId;
        });
        let updatedCache = s.allConversationsCache;
        if (cacheIdx !== -1) {
          updatedCache = [conv, ...s.allConversationsCache.filter((_, i) => i !== cacheIdx)];
        }

        next.conversations = updated;
        next.allConversationsCache = updatedCache;
      } else {
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
          UnReadMsgCount: isSelected ? 0 : 1,
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
          unreadCount: isSelected ? 0 : 1,
          tags: [],
          ticketStatus: null,
        };

        next.conversations = [enriched, ...s.conversations];
        next.allConversationsCache = [enriched, ...s.allConversationsCache];
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
      let changed = false;
      const updated = list.map((m) => {
        const mId = String(m.id ?? m.Id ?? m.autoid ?? m.MessageId);
        if (mId === targetId || mId === targetMessageId) {
          const currentStatus = m?.Status ?? m?.status;
          if (currentStatus === newStatus) return m;
          changed = true;
          return { ...m, status: newStatus, Status: newStatus };
        }
        return m;
      });
      if (!changed) return {};
      return {
        messagesByConversationId: {
          ...s.messagesByConversationId,
          [conversationId]: updated,
        },
      };
    });
  },

  handleSocketReaction: (data) => {
    /* placeholder — reactions are handled locally in ChatConversation for now */
  },
}));
