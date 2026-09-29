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

export const fetchPreloadChat = async (userId, page = 1, pageSize = 20, accountId = '') => {
  try {
    const payload = { Page: page, PageSize: pageSize };
    if (accountId) payload.AccountId = Number(accountId);
    const response = await callCommonApi({
      mode: 'wa_pre_load_chat',
      f: 'Chat ( Preload chat List Conversation )',
      p: JSON.stringify(payload),
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
