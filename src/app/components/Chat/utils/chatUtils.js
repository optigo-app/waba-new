import React from 'react';
import {
  Check, CheckCheck, Clock3, AlertCircle,
  Image, Video, FileText, File, MessageCircle, MapPin, Sticker, User,
} from 'lucide-react';
import { formatChatTimestamp } from './dateUtils';

const hashString = (value) => {
  const str = String(value ?? '');
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const firstLetter = (str) => (str.match(/[a-zA-Z]/) || [])[0] || '';
const lettersOnly = (str) => (str.match(/[a-zA-Z]+/g) || []).join('');

export const getInitials = (name) => {
  const cleaned = String(name ?? '').trim();
  if (!cleaned) return '?';

  // Pure number (e.g. "917579163438") → last 2 digits
  const numeric = cleaned.replace(/\D/g, '');
  if (numeric && !/\D/.test(cleaned)) {
    return numeric.slice(-2);
  }

  const parts = cleaned.split(/\s+/).filter(Boolean);
  // Ignore tokens that contain no letters (parentheses, symbols, etc.)
  const letterParts = parts.filter((p) => /[a-zA-Z]/.test(p));

  // 2+ letter words → first letter of first two words (e.g. "Shivam ( Optigoapps )" → "SO")
  if (letterParts.length >= 2) {
    return `${firstLetter(letterParts[0])}${firstLetter(letterParts[1])}`.toUpperCase();
  }

  // Single letter word → first 2 letters of that word (e.g. "(Doe)" → "DO")
  if (letterParts.length === 1) {
    return lettersOnly(letterParts[0]).slice(0, 2).toUpperCase();
  }

  // No letters at all — fallback to first 2 chars
  return cleaned.slice(0, 2).toUpperCase();
};

export const getSoftAvatarColors = (seed) => {
  const h = hashString(seed) % 360;
  const s = 45 + (hashString(`${seed}-s`) % 11);
  const l = 86 + (hashString(`${seed}-l`) % 8);

  const fgS = Math.min(72, s + 18);
  const fgL = 26 + (hashString(`${seed}-fg`) % 10);

  return {
    bg: `hsl(${h}, ${s}%, ${l}%)`,
    fg: `hsl(${h}, ${fgS}%, ${fgL}%)`,
  };
};

export const hasCustomerName = (customer) => {
  const name = customer?.CustomerName;
  const whatsappName = customer?.WhatsappCustName;
  return Boolean(String(name ?? '').trim()) || Boolean(String(whatsappName ?? '').trim());
};

export const getCustomerDisplayName = (customer) => {
  const name = String(customer?.CustomerName ?? '').trim();
  if (name) return name;

  const whatsappName = String(customer?.WhatsappCustName ?? '').trim();
  if (whatsappName) return whatsappName;

  const phone = String(customer?.CustomerPhone ?? '').trim();
  if (phone) return phone;

  const sender = String(customer?.Sender ?? '').trim();
  if (sender) {
    if (
      customer?.Direction === 0 ||
      customer?.Direction === '0' ||
      (customer?.Direction === undefined && /^\+?\d{5,}$/.test(sender))
    ) {
      return sender;
    }
  }

  const fallback = String(customer?.name ?? '').trim();
  if (fallback) return fallback;

  return 'Unknown';
};

export const getCustomerAvatarSeed = (customer) => {
  const name = String(customer?.CustomerName ?? '').trim();
  if (name) return name;

  const whatsappName = String(customer?.WhatsappCustName ?? '').trim();
  if (whatsappName) return whatsappName;

  const phone = String(customer?.CustomerPhone ?? '').trim();
  if (phone) return phone;

  const sender = String(customer?.Sender ?? '').trim();
  if (sender) {
    if (
      customer?.Direction === 0 ||
      customer?.Direction === '0' ||
      (customer?.Direction === undefined && /^\+?\d{5,}$/.test(sender))
    ) {
      return sender;
    }
  }
  return String(customer?.name ?? '').trim();
};

export const getWhatsAppAvatarConfig = (name, size = 40) => {
  const cleaned = String(name ?? '').trim();
  const { bg, fg } = getSoftAvatarColors(cleaned || 'unknown');

  return {
    sx: {
      bgcolor: bg,
      color: fg,
      width: size,
      height: size,
      fontSize: Math.max(14, Math.round(size * 0.4)),
      fontWeight: 600,
    },
    children: getInitials(cleaned),
  };
};

/* Channel display name — ChannelTitle first, fall back to WhatsappName */
export const getChannelDisplayName = (channel) => {
  const title = String(channel?.ChannelTitle || channel?.channelTitle || '').trim();
  if (title) return title;
  return String(channel?.WhatsappName || channel?.whatsappName || 'WhatsApp Channel').trim();
};

/* Channel WhatsappName — only when different from the display name */
export const getChannelSubName = (channel) => {
  const title = String(channel?.ChannelTitle || channel?.channelTitle || '').trim();
  const waName = String(channel?.WhatsappName || channel?.whatsappName || '').trim();
  if (!title || !waName) return '';
  if (title.toLowerCase() === waName.toLowerCase()) return '';
  return waName;
};

/* Channel mobile number */
export const getChannelMobile = (channel) => {
  return channel?.MobileNumber || channel?.WabaPhoneNo || '';
};

/* Channel avatar — uses initials (e.g. "Optigo Waba" → "OW") + unique soft colors */
export const getChannelAvatarConfig = (channel, size = 42) => {
  const name = getChannelDisplayName(channel);
  const { bg, fg } = getSoftAvatarColors(name || 'unknown');

  return {
    initials: getInitials(name),
    bg,
    fg,
    size,
  };
};

export const getMessagePreview = (msg) => {
  const type = msg?.MessageType;
  const text = type === 'text' ? (msg?.Message || '')
    : type === 'image' ? 'Photo'
      : type === 'video' ? 'Video'
        : type === 'document' ? 'Document'
          : type === 'file' ? 'File'
            : type === 'template' ? (msg?.Message ? `Template: ${msg.Message}` : 'Template')
              : type === 'location' ? 'Location'
                : type === 'sticker' ? 'Sticker'
                  : type === 'interactive' ? (getInteractiveReplyTitle(msg) || 'Interactive message')
                    : type === 'contacts' || type === 'contact'
                      ? (() => {
                          const c = parseContactData(msg);
                          const n = c.contacts?.length || 0;
                          return n > 1 ? `${n} contacts` : 'Contact';
                        })()
                      : 'New message';

  const showIcon = type === 'image' || type === 'video' || type === 'document' || type === 'file' || type === 'template' || type === 'location' || type === 'sticker' || type === 'interactive' || type === 'contacts' || type === 'contact';
  const Icon = type === 'image' ? Image
    : type === 'video' ? Video
      : type === 'document' ? FileText
        : type === 'file' ? File
          : type === 'template' ? MessageCircle
            : type === 'location' ? MapPin
              : type === 'sticker' ? Sticker
                : type === 'interactive' ? MessageCircle
                  : type === 'contacts' || type === 'contact' ? User
                    : null;

  if (!text) {
    return { text: '', node: '' };
  }

  const node = showIcon && Icon
    ? React.createElement(
      'span',
      { style: { display: 'inline-flex', alignItems: 'center', gap: 6 } },
      React.createElement(Icon, { size: 14 }),
      React.createElement('span', null, text)
    )
    : text;

  return { text, node };
};

export const processApiResponse = (apiData) => {
  if (!apiData || !Array.isArray(apiData)) return [];

  return apiData.map((conversation) => {
    let lastMessage = conversation.LastMessage;
    if (typeof lastMessage === 'string') {
      try {
        const parsed = JSON.parse(lastMessage);
        if (Array.isArray(parsed) && parsed.length > 0) {
          lastMessage = parsed[0];
        } else if (parsed && typeof parsed === 'object') {
          lastMessage = parsed;
        }
      } catch (e) {
        // ignore parse errors
      }
    }

    let tags = [];
    if (conversation.TagList) {
      try {
        tags =
          typeof conversation.TagList === 'string'
            ? JSON.parse(conversation.TagList)
            : conversation.TagList;
      } catch (e) {
        // ignore parse errors
      }
    }

    const preview = conversation.LastMessage ? getMessagePreview(lastMessage) : { text: '', node: '' };

    return {
      ...conversation,
      Id: conversation.Id ?? conversation.ConversationId ?? conversation.autoid,
      ConversationId: conversation.ConversationId ?? conversation.Id ?? conversation.autoid,
      lastMessage: preview.text || preview.node,
      lastMessageText: preview.text,
      lastMessageTime: formatChatTimestamp(lastMessage?.DateTime || conversation.DateTime),
      lastMessageTimestamp: lastMessage?.DateTime || conversation.DateTime,
      lastMessageStatus: lastMessage?.Status,
      lastMessageDirection: lastMessage?.Direction,
      unreadCount: conversation.UnReadMsgCount || 0,
      tags,
      name: getCustomerDisplayName(conversation),
      avatar: null,
      avatarConfig: getWhatsAppAvatarConfig(getCustomerAvatarSeed(conversation), 38),
      ticketStatus: conversation.ticketStatus || conversation.TicketStatus || null,
    };
  });
};

export const parseTemplateData = (message) => {
  if (!message || (message.MessageType !== 'template' && message.type !== 'template')) {
    return { isTemplate: false };
  }
  const raw = message.MetaData || message.metaData || message.MessageBody || message.messageBody;
  if (!raw) return { isTemplate: false };
  try {
    const body = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (body?.status === 404 || body?.success === false || body?.error) {
      return { isTemplate: false };
    }
    const template = body?.payload?.template || (body?.name ? body : null);
    if (!template) return { isTemplate: false };
    const params = {};
    const bodyComponent = template.components?.find((c) => c.type === 'body');
    if (bodyComponent?.parameters) {
      bodyComponent.parameters.forEach((param, index) => {
        if (param.type === 'text') {
          params[`param${index + 1}`] = param.text;
        }
      });
    }
    return {
      isTemplate: true,
      templateName: template.name,
      params,
      language: template.language?.code || 'en',
      components: template.components || [],
    };
  } catch (error) {
    console.error('Error parsing template message:', error);
    return { isTemplate: false };
  }
};

export const parseInteractiveData = (message) => {
  if (!message || (message.MessageType !== 'interactive' && message.type !== 'interactive')) {
    return { isInteractive: false };
  }
  const raw = message.MetaData || message.metaData;
  if (!raw) return { isInteractive: false };
  try {
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const header = data?.header || null;
    const headerUrl = header?.image?.link || header?.video?.link || header?.document?.link || '';
    const buttons = (data?.action?.buttons || [])
      .map((b) => ({ id: b?.reply?.id ?? b?.id ?? '', title: b?.reply?.title ?? b?.title ?? '' }))
      .filter((b) => b.title);
    return {
      isInteractive: true,
      interactiveType: data?.type || '',
      replyTitle: data?.button_reply?.title || data?.list_reply?.title || '',
      headerType: header?.type || '',
      headerUrl,
      headerText: header?.type === 'text' ? (header?.text || '') : '',
      bodyText: data?.body?.text || '',
      footerText: data?.footer?.text || '',
      buttons,
      listButtonText: data?.action?.button || '',
      sections: data?.action?.sections || [],
    };
  } catch {
    return { isInteractive: false };
  }
};

export const getInteractiveReplyTitle = (message) => {
  const raw = message?.MetaData || message?.metaData;
  if (!raw) return '';
  try {
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return data?.button_reply?.title || data?.list_reply?.title || '';
  } catch {
    return '';
  }
};

export const parseContactData = (message) => {
  const msgType = message?.MessageType || message?.type || '';
  if (!message || !['contacts', 'contact'].includes(msgType.toLowerCase())) {
    return { isContact: false };
  }
  const contacts = [];
  const raw = message.MetaData || message.metaData;
  if (raw) {
    try {
      const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
      const list = Array.isArray(data) ? data : (data?.contacts || data?.Contacts || []);
      list.forEach((c) => {
        const name =
          c?.name?.formatted_name || c?.Name?.Formatted_Name ||
          [c?.name?.first_name, c?.name?.last_name].filter(Boolean).join(' ') ||
          c?.formatted_name || c?.Formatted_Name || '';
        const phoneEntries = c?.phones || c?.Phones || (c?.phone || c?.Phone ? [c] : []);
        const phones = phoneEntries
          .map((p) => p?.phone || p?.Phone || p?.wa_id || '')
          .filter(Boolean);
        if (name || phones.length) contacts.push({ name, phones });
      });
    } catch { /* fall through to Message fallback */ }
  }
  // Fallback: Message carries the plain phone number when MetaData is empty
  if (contacts.length === 0) {
    const text = message.Message || message.content || message.text || '';
    if (text) contacts.push({ name: '', phones: [text] });
  }
  return contacts.length ? { isContact: true, contacts } : { isContact: false };
};

export const parseLocationData = (message) => {
  const msgType = message?.MessageType || message?.type || '';
  if (!message || msgType.toLowerCase() !== 'location') {
    return { isLocation: false };
  }
  let lat;
  let lng;
  let name = '';
  let address = '';
  const raw = message.MetaData || message.metaData;
  if (raw) {
    try {
      const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
      const loc = data?.location || data?.Location || data || {};
      lat = loc?.latitude ?? loc?.Latitude ?? loc?.lat;
      lng = loc?.longitude ?? loc?.Longitude ?? loc?.lng ?? loc?.long;
      name = loc?.name || loc?.Name || '';
      address = loc?.address || loc?.Address || '';
    } catch { /* fall through */ }
  }
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);
  const hasCoords = Number.isFinite(latitude) && Number.isFinite(longitude);
  return { isLocation: true, hasCoords, latitude, longitude, name, address };
};

export const extractTopTemplates = (conversations = [], perConversationLimit = 10) => {
  if (!Array.isArray(conversations)) return [];

  const allTemplateNames = new Set();

  conversations.forEach((conv) => {
    const msgs = conv.ChatMessages || [];

    // Collect template messages with dates
    const templateMessages = [];
    msgs.forEach((msg) => {
      const tData = parseTemplateData(msg);
      if (tData.isTemplate && tData.templateName) {
        const dateStr = msg.DateTime || msg.sentAt || msg.sent_at || msg.Date || '1970-01-01';
        templateMessages.push({
          templateName: tData.templateName,
          date: new Date(dateStr).getTime() || 0,
        });
      }
    });

    // Sort by date descending within this conversation
    templateMessages.sort((a, b) => b.date - a.date);

    // Take top N unique template names for this conversation
    const seen = new Set();
    for (const item of templateMessages) {
      if (!seen.has(item.templateName)) {
        seen.add(item.templateName);
        allTemplateNames.add(item.templateName);
        if (perConversationLimit > 0 && seen.size >= perConversationLimit) break;
      }
    }
  });

  return Array.from(allTemplateNames);
};

/**
 * Extract media cache info from preloaded conversations in a single pass.
 * @param {Array} conversations - Preloaded conversations with ChatMessages
 * @param {number} maxMissing - Max missing media items to track for background fetch
 * @returns {{ fileUrlCache: Object, missingMedia: Array }} - fileUrlCache: { mediaId: fileUrl }, missingMedia: [{ mediaId, convId }]
 */
export const extractMediaInfo = (conversations = [], maxMissing = 20) => {
  if (!Array.isArray(conversations)) return { fileUrlCache: {}, missingMedia: [], imageUrls: [] };

  const fileUrlCache = {};
  const missingMedia = [];
  const imageUrls = [];

  conversations.forEach((conv) => {
    const convId = String(conv.ConversationId ?? conv.Id ?? conv.CustomerId);
    const msgs = conv.ChatMessages || [];
    msgs.forEach((msg) => {
      const fileUrl = msg?.FileUrl;
      const mediaId = msg?.mediaUrl || msg?.MediaUrl || msg?.mediaId;
      const msgType = msg?.MessageType || msg?.type || '';
      const isImage = msgType?.toLowerCase() === 'image' || (fileUrl && /\.(jpg|jpeg|png|gif|webp|bmp|svg)/i.test(fileUrl));

      // Cache direct FileUrl -> mediaId mapping for instant loading
      if (fileUrl && mediaId && typeof mediaId === 'string' && !mediaId.startsWith('http')) {
        fileUrlCache[mediaId] = fileUrl;
      }
      // Collect image URLs for browser preloading (skip already-cached mediaId URLs)
      if (fileUrl && isImage && !imageUrls.includes(fileUrl)) {
        imageUrls.push(fileUrl);
      }
      // Track media without FileUrl for background fetching
      const isMediaIdValue = mediaId && typeof mediaId === 'string' && !/^(https?:|blob:|data:)/i.test(mediaId);
      if (isMediaIdValue && !fileUrl && (maxMissing === 0 || missingMedia.length < maxMissing)) {
        missingMedia.push({ mediaId, convId });
      }
    });
  });

  return { fileUrlCache, missingMedia, imageUrls };
};

/**
 * Limit messages to N per conversation, sorted by date descending (latest first).
 * @param {Array} conversations - Preloaded conversations with ChatMessages
 * @param {number} perConvLimit - Max messages per conversation (default 10)
 * @returns {Array} - Conversations with trimmed ChatMessages
 */
export const limitMessagesPerConversation = (conversations = [], perConvLimit = 10) => {
  if (!Array.isArray(conversations)) return [];
  return conversations.map((conv) => {
    const msgs = conv.ChatMessages || [];
    if (msgs.length <= perConvLimit) return conv;
    const sorted = [...msgs].sort((a, b) => {
      const tA = new Date(a?.DateTime || a?.sentAt || a?.sent_at || 0).getTime();
      const tB = new Date(b?.DateTime || b?.sentAt || b?.sent_at || 0).getTime();
      return tB - tA;
    });
    return { ...conv, ChatMessages: sorted.slice(0, perConvLimit) };
  });
};

export const getMessageStatusIcon = (member) => {
  if (member?.lastMessageDirection !== 1) return null;

  const status = typeof member?.lastMessageStatus === 'number' ? member.lastMessageStatus : -1;

  const iconProps = { size: 16, strokeWidth: 2.2, style: { marginRight: 5 } };

  switch (status) {
    case 0:
      return React.createElement(Clock3, { ...iconProps, style: { ...iconProps.style, color: 'var(--text-tertiary)' } });
    case 1:
      return React.createElement(Check, { ...iconProps, style: { ...iconProps.style, color: 'var(--text-tertiary)' } });
    case 2:
      return React.createElement(CheckCheck, { ...iconProps, style: { ...iconProps.style, color: 'var(--text-tertiary)' } });
    case 3:
      return React.createElement(CheckCheck, { ...iconProps, style: { ...iconProps.style, color: 'var(--wa-read-tick, #53bdeb)' } });
    case 4:
      return React.createElement(AlertCircle, { ...iconProps, style: { ...iconProps.style, color: 'var(--error-main)' } });
    default:
      return null;
  }
};

const URL_REGEX = /(https?:\/\/[^\s]+)|(www\.[^\s]+)/gi;
const TEL_REGEX = /\+?[\d\s\-]{7,20}/g;

export const renderLinks = (text = '', { onLinkClick } = {}) => {
  if (!text) return text;

  const parts = [];
  let lastIndex = 0;

  // Match URLs
  const urlMatches = Array.from(text.matchAll(URL_REGEX));
  const telMatches = Array.from(text.matchAll(TEL_REGEX));
  const allMatches = [...urlMatches, ...telMatches].sort((a, b) => a.index - b.index);

  for (const match of allMatches) {
    const start = match.index;
    const end = start + match[0].length;
    const isUrl = match[0].startsWith('http') || match[0].startsWith('www');

    if (start > lastIndex) {
      parts.push(text.slice(lastIndex, start));
    }

    const href = isUrl
      ? (match[0].startsWith('www') ? `https://${match[0]}` : match[0])
      : `tel:${match[0].replace(/\s/g, '')}`;

    const handleClick = (e) => {
      if (isUrl && onLinkClick) {
        e.preventDefault();
        onLinkClick(href);
      }
    };

    parts.push(
      React.createElement('a', {
        key: `link-${start}`,
        href,
        target: isUrl ? '_blank' : undefined,
        rel: isUrl ? 'noopener noreferrer' : undefined,
        style: {
          color: 'var(--primary-main)',
          textDecoration: 'none',
          fontWeight: 500,
          wordBreak: 'break-all',
          transition: 'opacity 0.2s',
        },
        onMouseOver: (e) => { e.target.style.opacity = '0.8'; e.target.style.textDecoration = 'underline'; },
        onMouseOut: (e) => { e.target.style.opacity = '1'; e.target.style.textDecoration = 'none'; },
        onClick: handleClick,
      }, match[0])
    );

    lastIndex = end;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : text;
};

// WhatsApp-style ordering: pinned conversations always on top, then latest first
export const sortConversations = (list) =>
  [...list].sort((a, b) => {
    const pA = Number(a?.IsPin) === 1 ? 1 : 0;
    const pB = Number(b?.IsPin) === 1 ? 1 : 0;
    if (pA !== pB) return pB - pA;
    const tA = new Date(a?.lastMessageTimestamp || a?.DateTime || 0).getTime();
    const tB = new Date(b?.lastMessageTimestamp || b?.DateTime || 0).getTime();
    return tB - tA;
  });
