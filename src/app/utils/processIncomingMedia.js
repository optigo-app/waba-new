import { fetchChatMediaBlob, saveMediaUrl } from '../api/chat/conversationApi';
import { filesUploadApi } from '../api/filesUploadApi';
import { generateMediaFolderName } from './generateMediaFolderName';
import { getUserData } from './storage';

const MEDIA_TYPES = ['image', 'video', 'document', 'audio'];

/**
 * Process incoming media messages from customers:
 * 1. Fetch actual media blob from Meta using media ID
 * 2. Upload the blob to our own server
 * 3. Save the server URL to backend via wa_save_media_url API
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
    // 1. Fetch media from Meta
    const mediaResult = await fetchChatMediaBlob(mediaUrl);
    if (!mediaResult) {
      console.warn('[processIncomingMedia] Failed to fetch media from Meta');
      return null;
    }

    let blobToUpload = null;
    let mimeType = '';

    if (mediaResult.blob) {
      blobToUpload = mediaResult.blob;
      mimeType = mediaResult.blob.type || 'application/octet-stream';
    } else if (mediaResult.url) {
      const resp = await fetch(mediaResult.url);
      if (!resp.ok) {
        console.warn('[processIncomingMedia] Failed to fetch media URL content');
        return null;
      }
      blobToUpload = await resp.blob();
      mimeType = blobToUpload.type || 'application/octet-stream';
    }

    if (!blobToUpload) {
      console.warn('[processIncomingMedia] No blob to upload');
      return null;
    }

    // 2. Upload to own server
    const ext = (mimeType.split('/')[1] || 'bin').replace(/[^a-z0-9]/gi, '');
    const fileName = `media_${mediaUrl}.${ext}`;
    const file = new File([blobToUpload], fileName, { type: mimeType });

    const folderName = generateMediaFolderName(conversationId, 'chat_media');
    const uploadResult = await filesUploadApi({
      attachments: [{ file }],
      folderName,
      uniqueNo: conversationId,
    });

    const serverUrl = uploadResult?.files?.[0]?.url;
    if (!serverUrl) {
      console.warn('[processIncomingMedia] Upload did not return URL');
      return null;
    }

    // 3. Save media URL to backend
    if (messageId) {
      await saveMediaUrl({ fileUrl: serverUrl, messageId, userId });
    }

    return { serverUrl, messageId, conversationId };
  } catch (err) {
    console.error('[processIncomingMedia] Error:', err);
    return null;
  }
};
