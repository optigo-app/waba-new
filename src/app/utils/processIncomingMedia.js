import { saveMediaUrl } from '../api/chat/conversationApi';
import { fetchAndCacheMedia } from './mediaCacheService';
import { getUserData } from './storage';

const MEDIA_TYPES = ['image', 'video', 'document', 'audio'];

/**
 * Process incoming media messages from customers:
 * 1. Use fetchAndCacheMedia (shared with UI) to fetch from Meta + upload to own server
 *    — deduplicated via mediaCacheService.inFlight so the UI lazy-loader won't double-fetch
 * 2. Save the server URL to backend via wa_save_media_url API
 *
 * @param {object} data - Incoming socket message payload
 * @returns {Promise<{serverUrl: string, messageId: string, conversationId: string} | null>}
 */
export const processIncomingMedia = async (data) => {
  const messageType = data?.MessageType ?? data?.type;
  if (!MEDIA_TYPES.includes(messageType)) return null;

  const messageId = data?.MessageId ?? data?.messageId;
  const mediaUrl = data?.MediaUrl ?? data?.mediaUrl;
  const fileUrl = data?.FileUrl ?? data?.fileUrl;

  // Already has server URL — nothing to do
  if (fileUrl && typeof fileUrl === 'string' && fileUrl.startsWith('http')) return null;

  // No Meta media identifier to fetch from
  if (!mediaUrl || typeof mediaUrl !== 'string') return null;

  // If mediaUrl is already an HTTP URL (not a Meta ID), skip
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
    // 1. Fetch + upload via shared cache service (deduplicated with UI lazy-loader)
    const serverUrl = await fetchAndCacheMedia(mediaUrl, conversationId);
    if (!serverUrl) {
      console.warn('[processIncomingMedia] Failed to fetch/cache media');
      return null;
    }

    // 2. Save media URL to backend
    if (messageId) {
      await saveMediaUrl({ fileUrl: serverUrl, messageId, userId });
    }

    return { serverUrl, messageId, conversationId };
  } catch (err) {
    console.error('[processIncomingMedia] Error:', err);
    return null;
  }
};
