import { saveMediaUrl } from '../api/chat/conversationApi';
import { fetchAndCacheMedia } from './mediaCacheService';
import { getUserData } from './storage';

const MEDIA_TYPES = ['image', 'video', 'document', 'audio', 'sticker'];

export const processIncomingMedia = async (data) => {
  const messageType = data?.MessageType ?? data?.type;
  if (!MEDIA_TYPES.includes(messageType)) return null;

  const messageId = data?.MessageId ?? data?.messageId;
  const mediaUrl = data?.MediaUrl ?? data?.mediaUrl;
  const fileUrl = data?.FileUrl ?? data?.fileUrl;

  if (fileUrl && typeof fileUrl === 'string' && fileUrl.startsWith('http')) return null;
  if (!mediaUrl || typeof mediaUrl !== 'string') return null;
  if (mediaUrl.startsWith('http') || mediaUrl.startsWith('blob:') || mediaUrl.startsWith('data:')) return null;

  const userData = getUserData();
  const userId = userData?.userId || userData?.id || '';
  if (!userId) {
    console.warn('[processIncomingMedia] No userId found');
    return null;
  }

  const conversationId = String(
    data?.ConversationId ?? data?.conversationId ?? data?.customerId ?? ''
  );
  if (!conversationId) {
    console.warn('[processIncomingMedia] No conversationId found');
    return null;
  }

  try {
    const serverUrl = await fetchAndCacheMedia(mediaUrl, conversationId);
    if (!serverUrl) {
      console.warn('[processIncomingMedia] Failed to fetch/cache media');
      return null;
    }

    if (messageId) {
      await saveMediaUrl({ fileUrl: serverUrl, messageId, userId });
    }

    return { serverUrl, messageId, conversationId };
  } catch (err) {
    console.error('[processIncomingMedia] Error:', err);
    return null;
  }
};
