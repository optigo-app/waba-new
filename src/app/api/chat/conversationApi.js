'use client';

import { callCommonApi } from '../CommonApi';
import { MESSAGEAPIURL, MESSAGEAPIURLBULK, MEDIARETRIEVED, READAPI, TEMPLATE_MD_UPLOAD, getHeaders, getHeaders1 } from '../Config';
import { getUserData } from '../../utils/storage';
import { useChatStore } from '../../store/chatStore';

/* Read the selected channel ID from the store so every API auto-includes AccountId */
const getAccountId = () => useChatStore.getState().selectedChannelId || '';

/* Read the selected channel's WhatsApp phone number from the store (multi-channel support) */
const getChannelPhoneNo = () => {
  const ch = useChatStore.getState().selectedChannel;
  return ch?.WabaPhoneNo || ch?.MobileNumber || '';
};

export const fetchChannels = async (userId, signal, page = 1, pageSize = 100, search = '') => {
  try {
    const payload = { Page: page, PageSize: pageSize, SearchTerm: search };
    const response = await callCommonApi({
      mode: 'wa_list_channel',
      f: 'Chat ( Channel List )',
      p: JSON.stringify(payload),
      userId,
      signal,
    });
    if (response?.Data?.rd) {
      const resultsArray = Array.isArray(response.Data.rd) ? response.Data.rd : [];
      const total = response?.Data?.total || 0;
      const currentPage = page;
      const hasMore = total > 0
        ? currentPage < Math.ceil(total / pageSize)
        : resultsArray.length === pageSize;
      return {
        data: resultsArray,
        total: total || resultsArray.length,
        currentPage,
        hasMore,
      };
    }
    return { data: [], total: 0, currentPage: page, hasMore: false };
  } catch (error) {
    if (error.message === 'AbortError' || error.name === 'AbortError') throw error;
    console.error('Error fetching channels:', error);
    return { data: [], total: 0, currentPage: page, hasMore: false };
  }
};

export const fetchConversationLists = async (page = 1, pageSize = 20, userId, search = '') => {
  try {
    const payload = { Page: page, PageSize: pageSize, SearchTerm: search };
    const accountId = getAccountId();
    if (accountId) {
      payload.AccountId = accountId;
    }
    const response = await callCommonApi({
      mode: 'wa_list_conv',
      f: 'Chat ( List Conversation )',
      p: JSON.stringify(payload),
      userId,
    });
    if (response?.Data?.rd || response?.Data?.rd[0]?.stat == 1) {
      const resultsArray = Array.isArray(response.Data)
        ? response.Data
        : (response.Data?.rd || []);
      return {
        data: response?.Data || [],
        total: response?.Data?.total || resultsArray.length || 0,
        currentPage: page,
        hasMore: resultsArray.length === pageSize,
      };
    }
    return { data: [], total: 0, currentPage: page, hasMore: false };
  } catch (error) {
    console.error('Error fetching conversation lists:', error);
    return { data: [], total: 0, currentPage: page, hasMore: false };
  }
};

export const fetchConversationView = async (conversationId, page = 1, pageSize = 10, userId, signal) => {
  try {
    const payload = { ConversationId: conversationId, Page: page, PageSize: pageSize };
    const accountId = getAccountId();
    if (accountId) payload.AccountId = accountId;
    const response = await callCommonApi({
      mode: 'wa_list_chat',
      f: 'Chat ( list )',
      p: JSON.stringify(payload),
      userId,
      signal,
    });
    if (response?.Data) {
      return {
        data: response?.Data || [],
        total: response?.Data?.total || response?.Data?.rd?.length || 0,
        currentPage: page,
        hasMore: response?.Data?.rd?.length === pageSize,
      };
    }
    return { data: [], total: 0, currentPage: page, hasMore: false };
  } catch (error) {
    if (error.message === 'AbortError' || error.name === 'AbortError') throw error;
    console.error('Error fetching conversation view:', error);
    return { data: [], total: 0, currentPage: page, hasMore: false };
  }
};

export const sendChatText = async ({ phoneNo, message, userId, customerId }) => {
  const body = {
    userId: String(userId),
    customerId: String(customerId),
    phoneNo: String(phoneNo),
    type: 'text',
    text: { body: message },
  };

  try {
    const _channelPhone = getChannelPhoneNo();
    const headers = getHeaders(_channelPhone ? { overrides: { whatsappNumber: _channelPhone, wabaphoneno: _channelPhone } } : {});
    const response = await fetch(MESSAGEAPIURL(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.error('Send message API error:', response.statusText);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Error sending message:', error);
    return null;
  }
};

export const uploadChatMedia = async (file, whatsappNumber, whatsappKey, onProgress) => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const channelPhone = getChannelPhoneNo() || whatsappNumber || '';
    const headers = getHeaders1(channelPhone ? { wabaphoneno: channelPhone } : {});

    // Simulated progress since native fetch doesn't expose upload progress
    let progressInterval = null;
    if (onProgress) {
      let simulated = 0;
      progressInterval = setInterval(() => {
        simulated += Math.random() * 12 + 3;
        if (simulated >= 95) simulated = 95;
        onProgress(Math.round(simulated));
      }, 400);
    }

    const response = await fetch(TEMPLATE_MD_UPLOAD(), {
      method: 'POST',
      headers,
      body: formData,
    });

    if (progressInterval) {
      clearInterval(progressInterval);
      onProgress(100);
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData?.error?.message || `Upload failed: ${response.statusText}`);
    }

    const json = await response.json();

    // Normalize response: isMeta=1 → { id: "..." }, isMeta=0 → { handle: { h: "..." }, provider: 1 }
    if (json?.data?.id) {
      return { id: json.data.id };
    }
    if (json?.data?.handle?.h) {
      return { id: json.data.handle.h, provider: json.data.provider };
    }
    if (json?.id) {
      return { id: json.id };
    }
    return json;
  } catch (error) {
    console.error('Upload Error:', error);
    throw error;
  }
};

export const fetchChatMediaBlob = async (mediaId) => {
  try {
    const _channelPhone = getChannelPhoneNo();
    const headers = getHeaders(_channelPhone ? { overrides: { whatsappNumber: _channelPhone } } : {});
    const response = await fetch(MEDIARETRIEVED(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({ mediaid: mediaId }),
    });

    if (!response.ok) {
      console.error('Media fetch API error:', response.statusText);
      return null;
    }

    const contentType = response.headers.get('Content-Type') || '';

    // If API returns JSON with a direct URL, return that URL string
    if (contentType.includes('application/json')) {
      const data = await response.json();
      if (data?.url || data?.mediaUrl || data?.link) {
        return { url: data.url || data.mediaUrl || data.link };
      }
      console.warn('[fetchChatMediaBlob] JSON response missing url/mediaUrl/link');
      return null;
    }

    // Otherwise return the actual binary blob (images, videos, documents, audio)
    const blob = await response.blob();
    return { blob };
  } catch (error) {
    console.error('Error fetching media blob:', error);
    return null;
  }
};

export const sendChatMedia = async ({ phoneNo, mediaUrl, mediaId, fileUrl, type, caption, userId, customerId, mediaName, mediaWidth, mediaHeight, mimeType }) => {
  const mediaPayload = { caption: caption || '' };
  if (fileUrl) {
    mediaPayload.link = fileUrl;
  } else if (mediaId) {
    mediaPayload.id = mediaId;
  } else if (mediaUrl) {
    mediaPayload.link = mediaUrl;
  }

  const body = {
    userId: String(userId),
    customerId: String(customerId),
    phoneNo: String(phoneNo),
    type,
    [type]: mediaPayload,
    ...(mediaName && { MediaName: mediaName }),
    ...(typeof mediaWidth === 'number' && { MediaWidth: mediaWidth }),
    ...(typeof mediaHeight === 'number' && { MediaHeight: mediaHeight }),
    ...(mimeType && { MimeType: mimeType }),
    ...(fileUrl && { FileUrl: fileUrl }),
  };

  try {
    const _channelPhone = getChannelPhoneNo();
    const headers = getHeaders(_channelPhone ? { overrides: { whatsappNumber: _channelPhone, wabaphoneno: _channelPhone } } : {});
    const response = await fetch(MESSAGEAPIURL(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.error('Send media API error:', response.statusText);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Error sending media:', error);
    return null;
  }
};

export const saveMediaUrl = async ({ fileUrl, messageId, userId }) => {
  try {
    const response = await callCommonApi({
      mode: 'wa_save_media_url',
      f: 'Save Media Url',
      p: JSON.stringify({ FileUrl: fileUrl, MessageId: messageId }),
      userId: String(userId || ''),
    });
    return response;
  } catch (error) {
    console.error('Error saving media URL:', error);
    return null;
  }
};

export const fetchTags = async () => {
  const userData = getUserData() || {};
  const accountId = getAccountId();
  const payload = {};
  if (accountId) payload.AccountId = accountId;
  const response = await callCommonApi({
    mode: 'tagslist',
    f: 'Chat module (tags list)',
    p: Object.keys(payload).length ? JSON.stringify(payload) : '',
    userId: String(userData?.userId || ''),
  });
  if (response?.Data?.rd) {
    return response.Data.rd;
  }
  return [];
};

export const fetchAllTags = async (userId, signal) => {
  try {
    const payload = {};
    const accountId = getAccountId();
    if (accountId) payload.AccountId = accountId;
    const response = await callCommonApi({
      mode: 'wa_list_tags',
      f: 'WhatsApp Chat ( List Tags )',
      p: Object.keys(payload).length ? JSON.stringify(payload) : '',
      userId,
      signal,
    });
    if (response?.Data) {
      return response.Data;
    }
    return null;
  } catch (error) {
    if (error.message === 'AbortError' || error.name === 'AbortError') throw error;
    console.error('Error fetching all tags:', error);
    return null;
  }
};

export const fetchCustomerTags = async (customerId, userId, signal) => {
  try {
    const accountId = getAccountId();
    const payload = { CustomerId: Number(customerId) };
    if (accountId) payload.AccountId = accountId;
    const response = await callCommonApi({
      mode: 'wa_list_tags',
      f: 'WhatsApp Chat ( List Tags )',
      p: JSON.stringify(payload),
      userId,
      signal,
    });
    if (response?.Data) {
      return response.Data;
    }
    return null;
  } catch (error) {
    if (error.message === 'AbortError' || error.name === 'AbortError') throw error;
    console.error('Error fetching customer tags:', error);
    return null;
  }
};

export const assignTag = async (conversationId, tagId) => {
  const userData = getUserData() || {};
  const accountId = getAccountId();
  const payload = {};
  if (accountId) payload.AccountId = accountId;
  return callCommonApi({
    mode: 'assigntag',
    f: 'Chat module (assign tag)',
    p: Object.keys(payload).length ? JSON.stringify(payload) : '',
    userId: String(userData?.userId || ''),
    extraCon: { conversationId: String(conversationId), tagId: String(tagId) },
  });
};

export const addTagsApi = async (customerId, tagName, userId) => {
  try {
    const accountId = getAccountId();
    const payload = { CustomerId: Number(customerId), TagName: tagName };
    if (accountId) payload.AccountId = accountId;
    const response = await callCommonApi({
      mode: 'wa_add_tags',
      f: 'WhatsApp Chat (Add Tags)',
      p: JSON.stringify(payload),
      userId,
    });
    if (response?.Data) {
      return response.Data;
    }
    return null;
  } catch (error) {
    console.error('Error adding tag:', error);
    return null;
  }
};

export const pinConversationApi = async (conversationId, userId, email) => {
  try {
    const payload = { ConversationId: conversationId, UserId: userId, UserBindConvField: 'IsPin', UserBindConvValue: 1 };
    const accountId = getAccountId();
    if (accountId) payload.AccountId = accountId;
    return await callCommonApi({
      mode: 'wa_bind_user_conv',
      f: 'Conversation pin ( Pin )',
      p: JSON.stringify(payload),
      userId: email,
    });
  } catch (error) {
    console.error('Error pinning conversation:', error);
    return null;
  }
};

export const unPinConversationApi = async (conversationId, userId, email) => {
  try {
    const payload = { ConversationId: conversationId, UserId: userId, UserBindConvField: 'IsPin', UserBindConvValue: 0 };
    const accountId = getAccountId();
    if (accountId) payload.AccountId = accountId;
    return await callCommonApi({
      mode: 'wa_bind_user_conv',
      f: 'Conversation pin ( Pin )',
      p: JSON.stringify(payload),
      userId: email,
    });
  } catch (error) {
    console.error('Error unpinning conversation:', error);
    return null;
  }
};

export const favoriteApi = async (conversationId, userId, email) => {
  try {
    const payload = { ConversationId: conversationId, UserId: userId, UserBindConvField: 'IsStar', UserBindConvValue: 1 };
    const accountId = getAccountId();
    if (accountId) payload.AccountId = accountId;
    return await callCommonApi({
      mode: 'wa_bind_user_conv',
      f: 'Conversation Star ( star )',
      p: JSON.stringify(payload),
      userId: email,
    });
  } catch (error) {
    console.error('Error favoriting conversation:', error);
    return null;
  }
};

export const unFavoriteApi = async (conversationId, userId, email) => {
  try {
    const payload = { ConversationId: conversationId, UserId: userId, UserBindConvField: 'IsStar', UserBindConvValue: 0 };
    const accountId = getAccountId();
    if (accountId) payload.AccountId = accountId;
    return await callCommonApi({
      mode: 'wa_bind_user_conv',
      f: 'Conversation Star ( star )',
      p: JSON.stringify(payload),
      userId: email,
    });
  } catch (error) {
    console.error('Error unfavoriting conversation:', error);
    return null;
  }
};

export const archieveApi = async (conversationId, userId, email) => {
  try {
    const payload = { ConversationId: conversationId, UserId: userId, UserBindConvField: 'IsArchived', UserBindConvValue: 1 };
    const accountId = getAccountId();
    if (accountId) payload.AccountId = accountId;
    return await callCommonApi({
      mode: 'wa_bind_user_conv',
      f: 'Conversation Archived ( Archived )',
      p: JSON.stringify(payload),
      userId: email,
    });
  } catch (error) {
    console.error('Error archiving conversation:', error);
    return null;
  }
};

export const unArchieveApi = async (conversationId, userId, email) => {
  try {
    const payload = { ConversationId: conversationId, UserId: userId, UserBindConvField: 'IsArchived', UserBindConvValue: 0 };
    const accountId = getAccountId();
    if (accountId) payload.AccountId = accountId;
    return await callCommonApi({
      mode: 'wa_bind_user_conv',
      f: 'Conversation Archived ( Archived )',
      p: JSON.stringify(payload),
      userId: email,
    });
  } catch (error) {
    console.error('Error unarchiving conversation:', error);
    return null;
  }
};

export const fetchAgentLists = async (userId, signal) => {
  try {
    const payload = {};
    const accountId = getAccountId();
    if (accountId) payload.AccountId = accountId;
    const response = await callCommonApi({
      mode: 'wa_chat_agent_list',
      f: 'Whatsapp Agent List ( List )',
      p: Object.keys(payload).length ? JSON.stringify(payload) : '',
      userId,
      signal,
    });
    if (response?.Data) {
      return response.Data;
    }
    return null;
  } catch (error) {
    if (error.message === 'AbortError' || error.name === 'AbortError') throw error;
    console.error('Error fetching agent lists:', error);
    return null;
  }
};

export const addAssignUser = async (conversationId, userId, email) => {
  try {
    const accountId = getAccountId();
    const payload = { ConversationId: conversationId, UserId: userId, IsAssign: 1, AssignBy: 1 };
    if (accountId) payload.AccountId = Number(accountId);
    const response = await callCommonApi({
      mode: 'wa_assign_conv',
      f: 'Assign Conversation to Agent ( Assign )',
      p: JSON.stringify(payload),
      userId: email,
    });
    if (response?.Data) {
      return response.Data;
    }
    return null;
  } catch (error) {
    console.error('Error assigning user:', error);
    return null;
  }
};

export const removeAssignUser = async (conversationId, userId, email) => {
  try {
    const accountId = getAccountId();
    const payload = { ConversationId: conversationId, UserId: userId, IsAssign: 0, AssignBy: 1 };
    if (accountId) payload.AccountId = Number(accountId);
    const response = await callCommonApi({
      mode: 'wa_assign_conv',
      f: 'Assign Conversation to Agent ( Assign )',
      p: JSON.stringify(payload),
      userId: email,
    });
    if (response) {
      return response;
    }
    return null;
  } catch (error) {
    console.error('Error unassigning user:', error);
    return null;
  }
};

export const sendReplyMessage = async ({ phoneNo, message, userId, customerId, contextId, contextType = 2 }) => {
  const body = {
    userId: String(userId),
    customerId: String(customerId),
    phoneNo: String(phoneNo),
    type: 'text',
    ContextType: contextType,
    context: { message_id: String(contextId) },
    text: { body: message, preview_url: false },
  };

  try {
    const _channelPhone = getChannelPhoneNo();
    const headers = getHeaders(_channelPhone ? { overrides: { whatsappNumber: _channelPhone, wabaphoneno: _channelPhone } } : {});
    const response = await fetch(MESSAGEAPIURL(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.error('Reply message API error:', response.statusText);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Error sending reply:', error);
    return null;
  }
};

export const sendForwardMessage = async ({ userId, contacts, type = 'text', contextType = 1, contextId, bodyText }) => {
  const body = {
    userId: String(userId),
    Customers: contacts.map((c) => ({
      customerId: c.customerId || c.CustomerId,
      phoneNo: c.phoneNo || c.CustomerPhone,
    })),
    type,
    ContextType: contextType,
    context: { message_id: String(contextId) },
    [type]: {
      preview_url: false,
      body: bodyText,
    },
  };

  try {
    const _channelPhone = getChannelPhoneNo();
    const headers = getHeaders(_channelPhone ? { overrides: { whatsappNumber: _channelPhone, wabaphoneno: _channelPhone } } : {});
    const response = await fetch(MESSAGEAPIURLBULK(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.error('Forward message API error:', response.statusText);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Error forwarding message:', error);
    return null;
  }
};

export const savePlayerId = async (socketId, userId, id, socketKey = 'SocketId') => {
  try {
    const response = await callCommonApi({
      mode: 'wa_save_device_tok',
      f: 'Agent Information (Save Device Token)',
      p: JSON.stringify({ UserId: Number(id), [socketKey]: String(socketId) }),
      userId,
    });
    if (response?.Data) {
      return response.Data;
    }
    return null;
  } catch (error) {
    console.error('Error saving player id:', error);
    return null;
  }
};

export const addCustomer = async (userPhone, userId = 1, firstName = '', lastName = '', conversationId = '') => {
  try {
    const response = await callCommonApi({
      mode: 'wa_add_customer',
      f: 'Chat ( Add Customer )',
      p: JSON.stringify({
        UserPhone: String(userPhone || ''),
        FirstName: String(firstName || ''),
        LastName: String(lastName || ''),
        ConversationId: String(conversationId || ''),
      }),
      userId,
    });
    if (response?.Data) {
      return response.Data;
    }
    return null;
  } catch (error) {
    console.error('Error adding customer:', error);
    return null;
  }
};

export const addConversation = async (userPhone, userId = 1) => {
  try {
    const response = await callCommonApi({
      mode: 'wa_add_conv',
      f: 'Chat ( Add Conversation )',
      p: JSON.stringify({ UserPhone: String(userPhone), UserId: String(userId) }),
      userId,
    });
    if (response?.Data) {
      return response.Data;
    }
    return null;
  } catch (error) {
    console.error('Error adding conversation:', error);
    return null;
  }
};

export const fetchCustomerLists = async (page = 1, pageSize = 20, searchTerm = '', userId) => {
  try {
    const response = await callCommonApi({
      mode: 'wa_customer_list_chat',
      f: 'WhatsApp Chat ( Customer List )',
      p: JSON.stringify({ Page: page, PageSize: pageSize, SearchTerm: searchTerm }),
      userId,
    });
    if (response?.Data) {
      return {
        data: response.Data.rd || [],
        total: response.Data.total || response.Data.rd?.length || 0,
        currentPage: page,
        hasMore: response.Data.rd?.length === pageSize,
      };
    }
    return { data: [], total: 0, currentPage: page, hasMore: false };
  } catch (error) {
    console.error('Error fetching customer lists:', error);
    return { data: [], total: 0, currentPage: page, hasMore: false };
  }
};

export const dataSync = async (userId) => {
  try {
    const response = await callCommonApi({
      mode: 'wa_chat_data_sync',
      f: 'Whatsapp ( Data sync )',
      p: '',
      userId,
    });
    if (response?.Data) {
      return response.Data;
    }
    return null;
  } catch (error) {
    console.error('Error data sync:', error);
    return null;
  }
};

export const deleteAssignedTags = async (customerId, tagId, userId) => {
  try {
    const accountId = getAccountId();
    const payload = { CustomerId: Number(customerId), TagId: Number(tagId) };
    if (accountId) payload.AccountId = accountId;
    const response = await callCommonApi({
      mode: 'wa_delete_user_tags',
      f: 'WhatsApp Chat ( Delete Tags )',
      p: JSON.stringify(payload),
      userId,
    });
    if (response?.Data) {
      return response.Data;
    }
    return null;
  } catch (error) {
    console.error('Error deleting assigned tag:', error);
    return null;
  }
};

export const readMessage = async (conversationId, userId, messageId = '', isTyping = false) => {
  try {
    const channel = useChatStore.getState().selectedChannel;
    const wabaPhoneNo = channel?.WabaPhoneNo || channel?.MobileNumber || '';
    const body = {
      ConversationId: Number(conversationId),
      IsTyping: Boolean(isTyping),
      UserId: String(userId),
    };
    if (messageId) {
      body.MessageId = String(messageId);
    }
    const response = await fetch(READAPI(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getHeaders1(wabaPhoneNo ? { wabaphoneno: wabaPhoneNo } : {}),
      },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error reading message:', error);
    return null;
  }
};

export const sendMessageReaction = async ({ userId, customerId, phoneNo, messageId, emoji }) => {
  const body = {
    userId: String(userId),
    customerId: String(customerId),
    phoneNo: String(phoneNo),
    type: 'reaction',
    reaction: {
      message_id: String(messageId),
      emoji: String(emoji),
    },
  };

  try {
    const _channelPhone = getChannelPhoneNo();
    const headers = getHeaders(_channelPhone ? { overrides: { whatsappNumber: _channelPhone, wabaphoneno: _channelPhone } } : {});
    const response = await fetch(MESSAGEAPIURL(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.error('Reaction API error:', response.statusText);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Error sending reaction:', error);
    return null;
  }
};

export const fetchMediaLists = async (page = 1, pageSize = 6, conversationId, userId) => {
  try {
    const accountId = getAccountId();
    const payload = { ConversationId: Number(conversationId), Page: page, PageSize: pageSize };
    if (accountId) payload.AccountId = accountId;
    const response = await callCommonApi({
      mode: 'wa_media_list_chat',
      f: 'Chat ( Media list )',
      p: JSON.stringify(payload),
      userId,
    });
    if (response?.Data) {
      return {
        data: response.Data.rd || [],
        total: response.Data.total || response.Data.rd?.length || 0,
        currentPage: page,
        hasMore: response.Data.rd?.length === pageSize,
      };
    }
    return { data: [], total: 0, currentPage: page, hasMore: false };
  } catch (error) {
    console.error('Error fetching media lists:', error);
    return { data: [], total: 0, currentPage: page, hasMore: false };
  }
};

