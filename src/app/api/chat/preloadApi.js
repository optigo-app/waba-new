'use client';

import { callCommonApi } from '../CommonApi';

const parseMessages = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }
  return [];
};

export const fetchPreloadChat = async (userId, page = 1, pageSize = 100) => {
  try {
    const response = await callCommonApi({
      mode: 'wa_pre_load_chat',
      f: 'Chat ( Preload chat List Conversation )',
      p: JSON.stringify({ Page: page, PageSize: pageSize }),
      userId,
    });
    if (response?.Data) {
      const rawList = response?.Data?.rd || [];
      const conversations = rawList.map((conv) => ({
        ...conv,
        ChatMessages: parseMessages(conv.ChatMessages),
      }));
      return {
        data: conversations,
      };
    }
    return { data: [] };
  } catch (error) {
    console.error('Error fetching preload chat:', error);
    return { data: [] };
  }
};
