'use client';

import { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from 'react';
import { useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { getCustomerDisplayName, getCustomerAvatarSeed, getWhatsAppAvatarConfig } from './utils/chatUtils';
import { fetchConversationView, sendChatText, sendChatMedia, sendReplyMessage, sendForwardMessage, fetchCustomerTags, fetchAgentLists, uploadChatMedia, deleteAssignedTags, sendMessageReaction, readMessage } from '../../api/chat/conversationApi';
import { filesUploadApi } from '../../api/filesUploadApi';
import { generateMediaFolderName } from '../../utils/generateMediaFolderName';
import { getStaticUrl } from '../../utils/globalFunc';
import { fetchAndCacheMedia, preloadCacheIntoState, setCachedMediaUrl, setCachedMediaUrls } from '../../utils/mediaCacheService';
import ChatHeader from './ChatHeader';
import ChatMessagesArea from './ChatMessagesArea';
import ChatInputArea from './ChatInputArea';
import MessageContextMenu from './MessageContextMenu';
import ForwardMessageModal from './ForwardMessageModal';
import { useAuth } from '../../hooks/useAuth';
import { useAuthStore } from '../../store/authStore';
import { useChatStore } from '../../store/chatStore';
import { emitReaction, addMessageReactionHandler, addStatusHandler } from '../../socket';
import TagsModal from './TagsModal';
import MediaViewer from './MediaViewer';
import RedirectionModal from './RedirectionModal';
import toast from 'react-hot-toast';

const EMPTY_MESSAGES = [];

export default function ChatConversation({
  selectedCustomer,
  onConversationRead,
  onViewConversationRead,
  onCustomerSelect,
  onBack,
  converList,
  isConversationRead,
  setIsConversationRead,
  onToggleDetailsPanel,
  pendingDropFiles,
  onClearPendingDropFiles,
}) {
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [tagModalOpen, setTagModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [mediaViewer, setMediaViewer] = useState({ open: false, src: '', filename: '', type: '', mediaItems: null, initialIndex: 0 });
  const [tagsList, setTagsList] = useState([]);
  const [replyToMessage, setReplyToMessage] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const lastMessageCountRef = useRef(0);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const messagesCacheRef = useRef(new Map());
  const emojiPickerRef = useRef(null);
  const [loadedMedia, setLoadedMedia] = useState({});
  const [mediaCache, setMediaCache] = useState({});
  const [forwardMessage, setForwardMessage] = useState(null);
  const [mediaPreview, setMediaPreview] = useState([]);
  const [selectedPreviewIndex, setSelectedPreviewIndex] = useState(0);
  const [isSendingMedia, setIsSendingMedia] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [redirectModal, setRedirectModal] = useState({ open: false, url: '' });
  const [blinkMessageId, setBlinkMessageId] = useState(null);
  const [reactionPickerMessageId, setReactionPickerMessageId] = useState(null);
  const [messageReactions, setMessageReactions] = useState({});
  const [assigneeList, setAssigneeList] = useState([]);
  const [escalatedList, setEscalatedList] = useState([]);
  const [tagsMenuAnchorEl, setTagsMenuAnchorEl] = useState(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const can = useAuthStore((s) => s.can);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTabletOrMobile = useMediaQuery('(max-width:1000px)');

  const handleDetailsClick = useCallback(() => {
    onToggleDetailsPanel?.();
  }, [onToggleDetailsPanel]);

  const checkScroll = useCallback(() => {
    const el = tagsScrollRef.current;
    if (el) {
      setCanScrollLeft(el.scrollLeft > 0);
      setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
    }
  }, []);

  const handleScrollTags = useCallback((direction) => {
    const el = tagsScrollRef.current;
    if (el) {
      const scrollAmount = direction === 'left' ? -150 : 150;
      el.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    const el = tagsScrollRef.current;
    if (el && !isMobile) {
      el.addEventListener('scroll', checkScroll);
      checkScroll();

      if (typeof window !== 'undefined' && window.ResizeObserver) {
        const observer = new ResizeObserver(checkScroll);
        observer.observe(el);
        return () => {
          el.removeEventListener('scroll', checkScroll);
          observer.disconnect();
        };
      }
      return () => {
        el.removeEventListener('scroll', checkScroll);
      };
    }
  }, [tagsList, isMobile, checkScroll]);
  const fileInputRef = useRef(null);
  const containerRef = useRef(null);
  const messagesListRef = useRef(null);
  const tagsScrollRef = useRef(null);
  const dragCounterRef = useRef(0);
  const fetchingMediaRef = useRef(new Set());
  const { auth } = useAuth();

  const conversationId = selectedCustomer?.ConversationId ?? selectedCustomer?.Id ?? selectedCustomer?.autoid;

  /* ── messages from store ── */
  const messages = useChatStore((s) => s.messagesByConversationId[conversationId] || EMPTY_MESSAGES);
  const setMessages = useCallback((updater) => {
    const store = useChatStore.getState();
    if (typeof updater === 'function') {
      store.setMessagesFn(conversationId, updater);
    } else {
      store.setMessages(conversationId, updater);
    }
  }, [conversationId]);

  // Refs for debounce / abort controller pattern (matches original waba-chat)
  const debounceTimerRef = useRef(null);
  const abortControllerRef = useRef(null);
  const latestRequestRef = useRef(0);
  const onConversationReadRef = useRef(onConversationRead);
  onConversationReadRef.current = onConversationRead;

  // Unified effect for conversation switching with debouncing
  useEffect(() => {
    // Clear any pending debounce
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (!conversationId) {
      setMessages([]);
      return;
    }

    // Clear media preview immediately on conversation switch so that
    // a sidebar drop-files effect (which fires after this effect) can
    // safely repopulate it without being wiped by the async load() below.
    setMediaPreview([]);

    // Debounce to prevent rapid clicks / StrictMode double-fire
    debounceTimerRef.current = setTimeout(() => {
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const requestId = ++latestRequestRef.current;

      const cacheKey = String(conversationId);
      const cached = messagesCacheRef.current.get(cacheKey);

      const load = async () => {
        setIsLoadingMore(false);
        setPage(1);
        setHasMore(true);
        setTagsList([]);
        setAssigneeList([]);
        setEscalatedList([]);
        setReplyToMessage(null);
        setLoadedMedia({});
        fetchingMediaRef.current.clear();
        // Pre-populate media cache from persistent service instead of clearing
        setMediaCache(preloadCacheIntoState());
        setUnreadCount(0);
        setForwardMessage(null);
        setReactionPickerMessageId(null);
        setMessageReactions({});

        const existing = useChatStore.getState().messagesByConversationId[conversationId] || [];
        if (cached) {
          setLoading(false);
          setMessages(cached);
        } else if (existing.length > 0) {
          // Preloaded messages available — show instantly, fetch fresh in background
          setLoading(false);
          setMessages(existing);
        } else {
          setLoading(true);
          setMessages(existing);
        }

        try {
          const response = await fetchConversationView(conversationId, 1, 30, auth?.userId, controller.signal);
          if (controller.signal.aborted) return;

          let list = response?.data?.rd || [];
          list = [...list].sort((a, b) => {
            const getTime = (m) => new Date(m?.DateTime || m?.sentAt || m?.sent_at || 0).getTime();
            return getTime(a) - getTime(b);
          });

          // Pre-populate media cache with FileUrl from API so media loads instantly
          const FileUrlCache = {};
          list.forEach((msg) => {
            const FileUrl = msg?.FileUrl;
            const mediaId = msg?.mediaUrl || msg?.MediaUrl || msg?.mediaId;
            if (FileUrl && mediaId && typeof mediaId === 'string' && !mediaId.startsWith('http')) {
              FileUrlCache[mediaId] = FileUrl;
            }
          });
          if (Object.keys(FileUrlCache).length > 0) {
            setCachedMediaUrls(FileUrlCache);
            setMediaCache((prev) => ({ ...prev, ...FileUrlCache }));
          }

          if (requestId === latestRequestRef.current) {
            // Merge with any real-time socket messages already in the store
            const existing = useChatStore.getState().messagesByConversationId[conversationId] || [];
            const apiIds = new Set(list.map((m) => String(m.id ?? m.Id ?? m.autoid ?? m.MessageId)));
            const extras = existing.filter((m) => {
              const id = String(m.id ?? m.Id ?? m.autoid ?? m.MessageId);
              return id && !apiIds.has(id);
            });
            const merged = extras.length > 0 ? [...list, ...extras] : list;
            merged.sort((a, b) => {
              const tA = new Date(a?.DateTime || a?.sentAt || 0).getTime();
              const tB = new Date(b?.DateTime || b?.sentAt || 0).getTime();
              return tA - tB;
            });
            setMessages(merged);
            setHasMore(response?.hasMore ?? (list.length === 30));
            setPage(1);
            // Cache messages for quick restore on conversation switch
            messagesCacheRef.current.set(cacheKey, merged);
            if (messagesCacheRef.current.size > 20) {
              const firstKey = messagesCacheRef.current.keys().next().value;
              messagesCacheRef.current.delete(firstKey);
            }
          }

          // Fetch customer tags
          if (selectedCustomer?.CustomerId && !controller.signal.aborted) {
            try {
              const tagsResponse = await fetchCustomerTags(selectedCustomer.CustomerId, auth?.userId, controller.signal);
              if (tagsResponse?.rd && requestId === latestRequestRef.current) {
                setTagsList(tagsResponse.rd);
              }
            } catch (tagErr) {
              // ignore tag fetch errors
            }
          }

          // Fetch agent lists (assignee + escalated share same API)
          if (auth?.userId && !controller.signal.aborted) {
            try {
              const agentResponse = await fetchAgentLists(auth?.userId, controller.signal);
              if (agentResponse?.rd && requestId === latestRequestRef.current) {
                setAssigneeList(agentResponse.rd);
              }
              if (agentResponse?.rd1 && requestId === latestRequestRef.current) {
                setEscalatedList(agentResponse.rd1);
              }
            } catch (agentErr) {
              // ignore agent fetch errors
            }
          }

          onConversationReadRef.current?.(true);
        } catch (err) {
          if (err.message === 'AbortError' || err.name === 'AbortError') {
            return;
          }
          console.error('Failed to load messages:', err);
        } finally {
          if (requestId === latestRequestRef.current) {
            setLoading(false);
          }
        }
      };

      load();
    }, 200);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [conversationId, auth?.userId, selectedCustomer?.autoid]);

  // In column-reverse mode, new messages naturally appear at the bottom.
  // No manual scroll management needed.

  // Keep store's selectedConversationId in sync with current open conversation
  useEffect(() => {
    if (conversationId) {
      useChatStore.getState().setSelectedConversationId(String(conversationId));
    }
  }, [conversationId]);

  // Call readMessage API when store signals a socket message arrived for open conversation
  useEffect(() => {
    if (!conversationId || !auth?.userId) return;
    const handler = (e) => {
      const cid = e?.detail?.conversationId;
      const mid = e?.detail?.messageId || '';
      if (cid && String(cid) === String(conversationId)) {
        readMessage(cid, auth.userId, mid).catch(() => {});
      }
    };
    window.addEventListener('waba:markConversationRead', handler);
    return () => window.removeEventListener('waba:markConversationRead', handler);
  }, [conversationId, auth?.userId]);

  // Media preview helpers (must be before handleSend)
  const ALLOWED_EXTS = ['.pdf', '.doc', '.docx', '.txt', '.ppt', '.pptx', '.xls', '.xlsx'/* , '.aac', '.amr', '.mp3', '.m4a', '.ogg' */];
  const isFileAllowed = (file) => {
    if (file.type.startsWith('image/') || file.type.startsWith('video/') /* || file.type.startsWith('audio/') */) return true;
    const allowedMime = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      /* 'audio/aac',
      'audio/amr',
      'audio/mpeg',
      'audio/mp4',
      'audio/ogg', */
    ];
    if (allowedMime.includes(file.type)) return true;
    const name = file.name.toLowerCase();
    return ALLOWED_EXTS.some((ext) => name.endsWith(ext));
  };

  const MAX_FILE_SIZE = 16 * 1024 * 1024; // 16 MB
  const MAX_FILES_COUNT = 10;

  const addMediaFiles = useCallback((files) => {
    if (!files?.length) return;
    const fileArray = Array.from(files);

    // Check disallowed types
    const disallowed = fileArray.filter((f) => !isFileAllowed(f));
    if (disallowed.length > 0) {
      toast.error(`Ignored unsupported file(s): ${disallowed.map((f) => f.name).join(', ')}`);
    }

    let validFiles = fileArray.filter(isFileAllowed);

    // Reject WebP images (not supported by the API)
    const webpFiles = validFiles.filter((f) => f.type === 'image/webp' || f.name.toLowerCase().endsWith('.webp'));
    if (webpFiles.length > 0) {
      toast.error(`WebP image uploads are not currently supported: ${webpFiles.map((f) => f.name).join(', ')}`);
      validFiles = validFiles.filter((f) => !(f.type === 'image/webp' || f.name.toLowerCase().endsWith('.webp')));
    }

    // Check file size
    const oversized = validFiles.filter((f) => f.size > MAX_FILE_SIZE);
    if (oversized.length > 0) {
      toast.error(`Ignored oversized file(s) (>16 MB): ${oversized.map((f) => f.name).join(', ')}`);
      validFiles = validFiles.filter((f) => f.size <= MAX_FILE_SIZE);
    }

    // Check duplicates against existing previews
    const existingNames = new Set(mediaPreview.map((p) => `${p.name}-${p.size}`));
    validFiles = validFiles.filter((f) => !existingNames.has(`${f.name}-${f.size}`));

    // Check total count
    const currentCount = mediaPreview.length;
    const remainingSlots = MAX_FILES_COUNT - currentCount;
    if (remainingSlots <= 0) {
      toast.error(`You can only upload up to ${MAX_FILES_COUNT} files.`);
      return;
    }
    if (validFiles.length > remainingSlots) {
      toast.error(`Only ${remainingSlots} more file(s) allowed. Ignored extras.`);
      validFiles = validFiles.slice(0, remainingSlots);
    }

    if (!validFiles.length) return;
    const newPreviews = validFiles.map((file) => {
      const previewUrl = URL.createObjectURL(file);
      const type = file.type.startsWith('image/')
        ? 'image'
        : file.type.startsWith('video/')
        ? 'video'
        /* : file.type.startsWith('audio/')
        ? 'audio' */
        : 'document';
      return { file, previewUrl, type, name: file.name, size: file.size };
    });
    setMediaPreview((prev) => [...prev, ...newPreviews]);
  }, [mediaPreview.length]);

  const removeMediaPreview = useCallback((index) => {
    setMediaPreview((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearMediaPreview = useCallback(() => {
    setMediaPreview([]);
    setSelectedPreviewIndex(0);
  }, []);

  // Read image/video dimensions from a File object
  const getMediaDimensions = (file) => {
    return new Promise((resolve) => {
      if (file.type.startsWith('image/')) {
        const img = new Image();
        img.onload = () => {
          resolve({ width: img.naturalWidth, height: img.naturalHeight });
          URL.revokeObjectURL(img.src);
        };
        img.onerror = () => resolve(null);
        img.src = URL.createObjectURL(file);
      } else if (file.type.startsWith('video/')) {
        const video = document.createElement('video');
        video.onloadedmetadata = () => {
          resolve({ width: video.videoWidth, height: video.videoHeight });
          URL.revokeObjectURL(video.src);
        };
        video.onerror = () => resolve(null);
        video.src = URL.createObjectURL(file);
      } else {
        resolve(null);
      }
    });
  };

  const handleSend = useCallback(async () => {
    if ((!input.trim() && mediaPreview.length === 0) || !selectedCustomer || !auth?.userId) return;
    const text = input.trim();
    setInput('');
    setSending(true);

    const isReply = !!replyToMessage;

    // If media previews exist, send them with optional caption
    if (mediaPreview.length > 0) {
      setIsSendingMedia(true);
      const previewsToSend = [...mediaPreview];
      clearMediaPreview();
      if (isReply) setReplyToMessage(null);

      for (const preview of previewsToSend) {
        const tempId = `temp-media-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        setMessages((prev) => [
          ...prev,
          {
            id: tempId,
            tempId: tempId,
            content: preview.name,
            fileName: preview.name,
            Message: text || '',
            type: preview.type,
            mediaUrl: preview.previewUrl,
            direction: 1,
            sentAt: new Date().toISOString(),
            Date: new Date().toISOString().split('T')[0],
            status: 'pending',
            isUploading: true,
            percent: 0,
            ...(isReply && { ContextType: 2, ReplyContext: replyToMessage }),
          },
        ]);

        let metaMediaId = null;
        let serverUrl = null;
        try {
          // 1. Upload to Meta server
          const metaResp = await uploadChatMedia(
            preview.file,
            auth?.whatsappNumber,
            auth?.whatsappKey,
            (percent) => {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === tempId ? { ...msg, isUploading: true, percent: Math.max(0, Math.min(99, percent)) } : msg
                )
              );
            }
          );
          metaMediaId = metaResp?.id ?? metaResp?.mediaId ?? null;

          if (!metaMediaId) {
            throw new Error('Meta upload did not return media id');
          }

          // 2. Upload to own server
          const folderName = generateMediaFolderName(conversationId, 'chat_media');
          const serverResp = await filesUploadApi({
            attachments: [{ file: preview.file }],
            folderName,
            uniqueNo: metaMediaId || tempId,
          });
          serverUrl = serverResp?.files?.[0]?.url ?? null;

          if (serverUrl) {
            // Update temp message with server URL so preview loads from server
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === tempId ? { ...msg, mediaUrl: serverUrl, FileUrl: serverUrl } : msg
              )
            );
          }
        } catch (err) {
          console.error('Upload failed:', err);
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === tempId ? { ...msg, status: 'failed', isUploading: false } : msg
            )
          );
          toast.error(err?.message || 'Failed to upload media');
          continue;
        }

        try {
          const mediaDimensions = await getMediaDimensions(preview.file);
          const sendResp = await sendChatMedia({
            phoneNo: selectedCustomer?.CustomerPhone || selectedCustomer?.Sender || '',
            mediaId: metaMediaId,
            fileUrl: serverUrl,
            type: preview.type,
            caption: text || '',
            userId: auth.userId,
            customerId: conversationId,
            mediaName: preview.name,
            mediaWidth: mediaDimensions?.width,
            mediaHeight: mediaDimensions?.height,
            mimeType: preview.file?.type,
          });

          if (!sendResp) {
            throw new Error('Failed to send media message');
          }

          // Mark sent
          const mediaApiStatus = sendResp?.data?.messageStatus || sendResp?.Data?.messageStatus;
          const mediaMsgId = sendResp?.data?.messageId || sendResp?.Data?.messageId || sendResp?.Data?.autoid;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === tempId
                ? { ...msg, isUploading: false, status: mediaApiStatus || 'sent', id: mediaMsgId || tempId, autoid: mediaMsgId, MessageId: mediaMsgId || msg.MessageId }
                : msg
            )
          );

          // If still pending, check status after delay
          if (mediaApiStatus === 'pending' && mediaMsgId) {
            setTimeout(async () => {
              try {
                const result = await fetchConversationView(conversationId, 1, 10, auth?.userId);
                if (result?.data) {
                  const list = Array.isArray(result.data) ? result.data : (result.data?.rd || []);
                  const found = list.find((m) =>
                    String(m.id ?? m.Id ?? m.autoid ?? m.MessageId) === String(mediaMsgId)
                  );
                  if (found) {
                    const newStatus = found?.Status ?? found?.status;
                    if (newStatus !== undefined && newStatus !== 'pending' && newStatus !== 0) {
                      setMessages((prev) =>
                        prev.map((msg) =>
                          msg.id === mediaMsgId || msg.autoid === mediaMsgId
                            ? { ...msg, status: newStatus, Status: newStatus }
                            : msg
                        )
                      );
                    }
                  }
                }
              } catch (e) {
                console.error('Status check error:', e);
              }
            }, 3000);
          }
        } catch (err) {
          console.error('Media send error:', err);
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === tempId ? { ...msg, status: 'failed', isUploading: false } : msg
            )
          );
          toast.error(err?.message || 'Failed to send media');
        }
      }

      setIsSendingMedia(false);
      setSending(false);
      return;
    }

    // Text-only send
    const tempId = `temp-${Date.now()}`;

    // Optimistic UI update
    setMessages((prev) => [
      ...prev,
      {
        id: tempId,
        content: text,
        message: text,
        direction: 1,
        sentAt: new Date().toISOString(),
        Date: new Date().toISOString().split('T')[0],
        status: 'pending',
        ...(isReply && {
          ContextType: 2,
          ReplyContext: replyToMessage,
        }),
      },
    ]);

    try {
      let response;
      if (isReply) {
        response = await sendReplyMessage({
          phoneNo: selectedCustomer?.CustomerPhone || selectedCustomer?.Sender || '',
          message: text,
          userId: auth.userId,
          customerId: conversationId,
          contextId: replyToMessage.id || replyToMessage.MessageId || replyToMessage.autoid,
        });
      } else {
        response = await sendChatText({
          phoneNo: selectedCustomer?.CustomerPhone || selectedCustomer?.Sender || '',
          message: text,
          userId: auth.userId,
          customerId: auth.id,
        });
      }

      if (response) {
        const apiStatus = response?.data?.messageStatus || response?.Data?.messageStatus;
        const serverMsgId = response?.data?.messageId || response?.Data?.messageId || response?.Data?.autoid;
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === tempId
              ? { ...msg, status: apiStatus || 'sent', id: serverMsgId || tempId, MessageId: serverMsgId || msg.MessageId, autoid: serverMsgId || msg.autoid }
              : msg
          )
        );

        // If still pending, check status after delay
        if (apiStatus === 'pending' && serverMsgId) {
          setTimeout(async () => {
            try {
              const result = await fetchConversationView(conversationId, 1, 10, auth?.userId);
              if (result?.data) {
                const list = Array.isArray(result.data) ? result.data : (result.data?.rd || []);
                const found = list.find((m) =>
                  String(m.id ?? m.Id ?? m.autoid ?? m.MessageId) === String(serverMsgId)
                );
                if (found) {
                  const newStatus = found?.Status ?? found?.status;
                  if (newStatus !== undefined && newStatus !== 'pending' && newStatus !== 0) {
                    setMessages((prev) =>
                      prev.map((msg) =>
                        msg.id === serverMsgId || msg.autoid === serverMsgId
                          ? { ...msg, status: newStatus, Status: newStatus }
                          : msg
                      )
                    );
                  }
                }
              }
            } catch (e) {
              console.error('Status check error:', e);
            }
          }, 3000);
        }
      } else {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === tempId ? { ...msg, status: 'failed' } : msg
          )
        );
        toast.error('Failed to send message');
      }
    } catch (err) {
      console.error('Send error:', err);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === tempId ? { ...msg, status: 'failed' } : msg
        )
      );
      toast.error('Failed to send message');
    } finally {
      setIsSendingMedia(false);
      setSending(false);
      if (isReply) setReplyToMessage(null);
    }
  }, [input, selectedCustomer, auth?.userId, replyToMessage, mediaPreview, clearMediaPreview]);

  const handleExternalLinkClick = useCallback((url) => {
    setRedirectModal({ open: true, url });
  }, []);

  const handleReply = useCallback((message) => {
    const messageId = message?.id || message?.Id || message?.autoid || message?.MessageId;
    setReplyToMessage({
      id: messageId,
      sender: message?.direction === 1 || message?.Direction === 1 ? 'You' : getCustomerDisplayName(selectedCustomer) || 'Customer',
      text: message?.Message || message?.content || message?.text || 'Media',
      original: message,
    });
  }, [selectedCustomer]);

  const scrollToMessage = useCallback((targetId) => {
    const el = containerRef.current?.querySelector(`[data-message-id="${targetId}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setBlinkMessageId(targetId);
      setTimeout(() => setBlinkMessageId(null), 2000);
    }
  }, []);

  const handleContextMenuOpen = useCallback((event, message) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({
      message,
      mouseX: event.clientX - 2,
      mouseY: event.clientY - 4,
    });
  }, []);

  const handleContextMenuClose = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleForward = useCallback((message) => {
    setForwardMessage(message);
  }, []);

  const handleSendForward = useCallback(async (selectedContacts) => {
    if (!selectedContacts?.length || !forwardMessage || !auth?.userId) {
      toast.error('Please select at least one contact');
      return;
    }
    try {
      const response = await sendForwardMessage({
        userId: auth.userId,
        contacts: selectedContacts,
        type: 'text',
        contextType: 1,
        contextId: forwardMessage.id || forwardMessage.MessageId || forwardMessage.autoid,
        bodyText: forwardMessage.Message || forwardMessage.content || forwardMessage.text || '',
      });
      if (response) {
        toast.success('Message forwarded successfully');
      } else {
        toast.error('Failed to forward message');
      }
    } catch (error) {
      console.error('Forward error:', error);
      toast.error('Failed to forward message');
    } finally {
      setForwardMessage(null);
    }
  }, [forwardMessage, auth?.userId]);

  const handleDeleteTag = useCallback(async (tag) => {
    if (!tag?.Id || !selectedCustomer?.CustomerId || !auth?.userId) return;
    try {
      const response = await deleteAssignedTags(selectedCustomer.CustomerId, tag.Id, auth.userId);
      if (response) {
        toast.success('Tag removed');
        // Re-fetch tags
        try {
          const tagsResponse = await fetchCustomerTags(selectedCustomer.CustomerId, auth.userId);
          if (tagsResponse?.rd) {
            setTagsList(tagsResponse.rd);
          }
        } catch (err) {
          console.error('Failed to refresh tags:', err);
        }
      } else {
        toast.error('Failed to remove tag');
      }
    } catch (error) {
      console.error('Delete tag error:', error);
      toast.error('Failed to remove tag');
    }
  }, [selectedCustomer?.CustomerId, auth?.userId]);

  const handleFileUpload = useCallback(
    (e) => {
      const files = e.target.files;
      if (!files?.length || !selectedCustomer) return;
      addMediaFiles(files);
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [selectedCustomer, addMediaFiles]
  );

  const handleReactionSelect = useCallback((msg, emoji) => {
    // msgId for local React state key
    const msgId = msg?.id || msg?.Id || msg?.autoid || msg?.MessageId;
    // waMessageId for WhatsApp API — must be the wamid, not internal DB Id
    const waMessageId = msg?.MessageId || msg?.id || msg?.Id || msgId;

    setMessageReactions((prev) => ({ ...prev, [msgId]: emoji }));
    setReactionPickerMessageId(null);

    // Real-time socket broadcast
    emitReaction({
      conversationId,
      messageId: msgId,
      emoji,
      userId: auth?.userId,
    });

    // Send reaction via WhatsApp API
    sendMessageReaction({
      userId: auth?.userId,
      customerId: 0,
      phoneNo: selectedCustomer?.CustomerPhone || selectedCustomer?.Sender || '',
      messageId: waMessageId,
      emoji,
    }).catch((err) => {
      console.error('Reaction API error:', err);
    });
  }, [conversationId, auth?.userId, selectedCustomer]);

  // Listen for incoming reactions via socket
  useEffect(() => {
    const removeHandler = addMessageReactionHandler((data) => {
      if (!data) return;
      const { messageId, emoji } = data;
      if (messageId && emoji) {
        setMessageReactions((prev) => ({ ...prev, [messageId]: emoji }));
      }
    });
    return () => removeHandler();
  }, []);

  // Listen for message status changes via socket
  useEffect(() => {
    const removeHandler = addStatusHandler((data) => {
      if (!data) return;
      try {
        useChatStore.getState().handleSocketStatusChange(data);
      } catch (e) {
        console.error('Status change handler error:', e);
      }
    });
    return () => removeHandler();
  }, []);

  // Scroll handling for showScrollToBottom (column-reverse mode)
  const handleScroll = useCallback(() => {
    const container = messagesListRef.current;
    if (!container) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    // In column-reverse, scrollTop=0 is the bottom (newest messages).
    // scrollTop increases as user scrolls UP towards older messages.
    const isNearBottom = scrollTop < 150;
    setShowScrollToBottom(!isNearBottom);
    if (isNearBottom) {
      setUnreadCount(0);
      lastMessageCountRef.current = messages.length;
    }
  }, [messages.length]);

  // Ref to track scroll position that needs restoration after prepending older messages
  const scrollRestoreRef = useRef(null);
  // Track whether new items were actually added in the last loadMoreMessages call
  const addedCountRef = useRef(0);

  // Restore scroll position synchronously after DOM updates (before browser paint)
  // This prevents the visual jump to bottom when older messages are prepended
  useLayoutEffect(() => {
    if (!scrollRestoreRef.current || !messagesListRef.current) return;
    // Only restore if new items were actually added
    if (addedCountRef.current === 0) {
      scrollRestoreRef.current = null;
      return;
    }
    const { prevScrollHeight, prevScrollTop } = scrollRestoreRef.current;
    const container = messagesListRef.current;
    const newScrollHeight = container.scrollHeight;
    const heightDiff = newScrollHeight - prevScrollHeight;
    // In column-reverse, scrollTop increases as user scrolls up.
    // Prepending older messages adds height at the visual top, so we must
    // increase scrollTop by the added height to keep the same visual position.
    container.scrollTop = prevScrollTop + heightDiff;
    scrollRestoreRef.current = null;
    addedCountRef.current = 0;
  }, [messages.length]);

  // Ref-based guard to prevent double loadMoreMessages calls from IntersectionObserver + onScroll
  const isLoadingMoreRef = useRef(false);

  // Load older messages on scroll-to-top (30 per page for smooth pagination)
  const loadMoreMessages = useCallback(async () => {
    if (isLoadingMoreRef.current || !hasMore || !conversationId || !auth?.userId) return;
    isLoadingMoreRef.current = true;
    const nextPage = page + 1;
    setIsLoadingMore(true);

    // Save scroll position before fetching — will be restored in useLayoutEffect after DOM update
    const container = messagesListRef.current;
    scrollRestoreRef.current = {
      prevScrollHeight: container?.scrollHeight || 0,
      prevScrollTop: container?.scrollTop || 0,
    };
    addedCountRef.current = 0;

    try {
      const response = await fetchConversationView(conversationId, nextPage, 30, auth?.userId);
      let list = response?.data?.rd || [];
      list = [...list].sort((a, b) => {
        const getTime = (m) => new Date(m?.DateTime || m?.sentAt || m?.sent_at || 0).getTime();
        return getTime(a) - getTime(b);
      });

      if (list.length > 0) {
        // Pre-populate media cache with FileUrl for newly loaded older messages
        const FileUrlCache = {};
        list.forEach((msg) => {
          const FileUrl = msg?.FileUrl;
          const mediaId = msg?.mediaUrl || msg?.MediaUrl || msg?.mediaId;
          if (FileUrl && mediaId && typeof mediaId === 'string' && !mediaId.startsWith('http')) {
            FileUrlCache[mediaId] = FileUrl;
          }
        });
        if (Object.keys(FileUrlCache).length > 0) {
          setCachedMediaUrls(FileUrlCache);
          setMediaCache((prev) => ({ ...prev, ...FileUrlCache }));
        }

        let newCount = 0;
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id || m.Id || m.autoid));
          const newItems = list.filter((m) => {
            const id = m.id || m.Id || m.autoid;
            if (!existingIds.has(id)) {
              newCount++;
              return true;
            }
            return false;
          });
          return [...newItems, ...prev];
        });
        addedCountRef.current = newCount;
        // Scroll position is restored by useLayoutEffect watching messages.length
      } else {
        // No new items — clear restore ref so useLayoutEffect doesn't fire
        scrollRestoreRef.current = null;
      }

      setHasMore(response?.hasMore ?? (list.length === 30));
      setPage(nextPage);
    } catch (err) {
      scrollRestoreRef.current = null;
      console.error('Failed to load older messages:', err);
    } finally {
      isLoadingMoreRef.current = false;
      setIsLoadingMore(false);
    }
  }, [hasMore, conversationId, auth?.userId, page]);

  // Drag & drop handlers (counter-based to avoid child-element flicker)
  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
    if (dragCounterRef.current === 0) {
      setIsDragOver(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files?.length) {
      addMediaFiles(files);
    }
  }, [addMediaFiles]);

  // Track unread messages when new messages arrive while scrolled up
  useEffect(() => {
    const container = messagesListRef.current;
    if (!container) return;
    const { scrollTop } = container;
    // In column-reverse, scrollTop > 150 means user scrolled up (away from bottom)
    const isNearBottom = scrollTop < 150;
    if (!isNearBottom && messages.length > lastMessageCountRef.current) {
      const newMessages = messages.length - lastMessageCountRef.current;
      setUnreadCount((prev) => prev + newMessages);
    }
    if (isNearBottom) {
      lastMessageCountRef.current = messages.length;
    }
  }, [messages.length]);

  useEffect(() => {
    const container = messagesListRef.current;
    if (!container) return;
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll, conversationId]);

  // Auto-load more messages when content doesn't fill the viewport (no scrollbar to scroll)
  useEffect(() => {
    if (loading || isLoadingMore || !hasMore || !conversationId) return;
    const container = messagesListRef.current;
    if (!container) return;
    if (container.scrollHeight <= container.clientHeight) {
      loadMoreMessages();
    }
  }, [messages.length, hasMore, isLoadingMore, loading, conversationId, loadMoreMessages]);

  // Close emoji picker on click outside
  useEffect(() => {
    if (!emojiPickerOpen) return;
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setEmojiPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [emojiPickerOpen]);

  // Process files dropped on a sidebar conversation item
  useEffect(() => {
    if (pendingDropFiles?.length) {
      addMediaFiles(pendingDropFiles);
      onClearPendingDropFiles?.();
    }
  }, [pendingDropFiles, addMediaFiles, onClearPendingDropFiles]);

  // Lazy media fetch — called by MessageBubble when media enters viewport
  const requestMediaFetch = useCallback(async (mediaId) => {
    if (!mediaId || typeof mediaId !== 'string') return;
    if (fetchingMediaRef.current.has(mediaId)) return;
    fetchingMediaRef.current.add(mediaId);
    try {
      const url = await fetchAndCacheMedia(mediaId, conversationId);
      if (url) {
        setMediaCache((prev) => ({ ...prev, [mediaId]: url }));
      }
    } catch (err) {
      console.error('Failed to fetch media', mediaId, err);
    } finally {
      fetchingMediaRef.current.delete(mediaId);
    }
  }, [conversationId]);

  // NOTE: Blob URL cleanup is handled by mediaCacheService when blob URLs
  // are replaced with server URLs after upload. No manual cleanup needed here.

  const scrollToBottom = useCallback(() => {
    const container = messagesListRef.current;
    if (!container) return;
    container.scrollTop = 0;
  }, []);

  if (!selectedCustomer) {
    return (
      <div className="chat-conversation empty-state">
        <div className="chat-empty-center">
          <img src={getStaticUrl('/waba_logo.png')} alt="Logo" className="chat-empty-logo" />
          <h2 className="chat-empty-title">Welcome to WABA-Chat</h2>
          <p className="chat-empty-subtitle">Select a conversation to start chatting</p>
        </div>
      </div>
    );
  }

  // Use the same avatar config as sidebar (processApiResponse sets it).
  // Fallback uses same seed function as sidebar for consistent color.
  const baseAvatarConfig = selectedCustomer?.avatarConfig
    || getWhatsAppAvatarConfig(getCustomerAvatarSeed(selectedCustomer), 38);

  return (
    <div className="chat-conversation">
      <ChatHeader
        selectedCustomer={selectedCustomer}
        isTabletOrMobile={isTabletOrMobile}
        isMobile={isMobile}
        onBack={onBack}
        tagsList={tagsList}
        setTagModalOpen={setTagModalOpen}
        tagsMenuAnchorEl={tagsMenuAnchorEl}
        setTagsMenuAnchorEl={setTagsMenuAnchorEl}
        canScrollLeft={canScrollLeft}
        canScrollRight={canScrollRight}
        handleScrollTags={handleScrollTags}
        tagsScrollRef={tagsScrollRef}
        assigneeList={assigneeList}
        setAssigneeList={setAssigneeList}
        escalatedList={escalatedList}
        setEscalatedList={setEscalatedList}
        auth={auth}
        onToggleDetails={handleDetailsClick}
        onDeleteTag={handleDeleteTag}
      />

      <ChatMessagesArea
        conversationId={conversationId}
        messages={messages}
        loading={loading}
        isDragOver={isDragOver}
        containerRef={containerRef}
        messagesListRef={messagesListRef}
        handleDragEnter={handleDragEnter}
        handleDragOver={handleDragOver}
        handleDragLeave={handleDragLeave}
        handleDrop={handleDrop}
        mediaPreview={mediaPreview}
        selectedPreviewIndex={selectedPreviewIndex}
        setSelectedPreviewIndex={setSelectedPreviewIndex}
        isSendingMedia={isSendingMedia}
        clearMediaPreview={clearMediaPreview}
        removeMediaPreview={removeMediaPreview}
        fileInputRef={fileInputRef}
        showScrollToBottom={showScrollToBottom}
        setShowScrollToBottom={setShowScrollToBottom}
        unreadCount={unreadCount}
        setUnreadCount={setUnreadCount}
        scrollToBottom={scrollToBottom}
        baseAvatarConfig={baseAvatarConfig}
        messageReactions={messageReactions}
        loadedMedia={loadedMedia}
        setLoadedMedia={setLoadedMedia}
        mediaCache={mediaCache}
        requestMediaFetch={requestMediaFetch}
        setMediaViewer={setMediaViewer}
        reactionPickerMessageId={reactionPickerMessageId}
        setReactionPickerMessageId={setReactionPickerMessageId}
        onContextMenuOpen={handleContextMenuOpen}
        onReactionSelect={handleReactionSelect}
        onExternalLinkClick={handleExternalLinkClick}
        blinkMessageId={blinkMessageId}
        scrollToMessage={scrollToMessage}
        input={input}
        setInput={setInput}
        handleSend={handleSend}
        sending={sending}
        emojiPickerOpen={emojiPickerOpen}
        setEmojiPickerOpen={setEmojiPickerOpen}
        isLoadingMore={isLoadingMore}
        hasMore={hasMore}
        loadMoreMessages={loadMoreMessages}
      />

      {/* Hidden file input — always rendered */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleFileUpload}
        accept="image/*,video/*,application/pdf,.doc,.docx,.txt,.ppt,.pptx,.xls,.xlsx" /* audio/*,.aac,.amr,.mp3,.m4a,.ogg */
        multiple
      />

      {can(6) && mediaPreview.length === 0 && (
        <ChatInputArea
          key={selectedCustomer?.CustomerId || selectedCustomer?.autoid}
          replyToMessage={replyToMessage}
          setReplyToMessage={setReplyToMessage}
          fileInputRef={fileInputRef}
          uploading={uploading}
          handleFileUpload={handleFileUpload}
          input={input}
          setInput={setInput}
          handleSend={handleSend}
          sending={sending}
          mediaPreviewLength={mediaPreview.length}
          emojiPickerOpen={emojiPickerOpen}
          setEmojiPickerOpen={setEmojiPickerOpen}
          emojiPickerRef={emojiPickerRef}
          addMediaFiles={addMediaFiles}
        />
      )}

      <TagsModal
        open={tagModalOpen}
        onClose={() => setTagModalOpen(false)}
        selectedCustomer={selectedCustomer}
        onTagAdded={async () => {
          onConversationRead?.(true);
          // Re-fetch tags so new one reflects immediately
          if (selectedCustomer?.CustomerId && auth?.userId) {
            try {
              const tagsResponse = await fetchCustomerTags(selectedCustomer.CustomerId, auth.userId);
              if (tagsResponse?.rd) {
                setTagsList(tagsResponse.rd);
              }
            } catch (err) {
              console.error('Failed to refresh tags:', err);
            }
          }
        }}
      />

      <MediaViewer
        open={mediaViewer.open}
        onClose={() => setMediaViewer({ open: false, src: '', filename: '', type: '' })}
        src={mediaViewer.src}
        filename={mediaViewer.filename}
        type={mediaViewer.type}
        mediaItems={mediaViewer.mediaItems}
        initialIndex={mediaViewer.initialIndex ?? 0}
      />

      <MessageContextMenu
        open={contextMenu !== null}
        onClose={handleContextMenuClose}
        onReply={handleReply}
        onForward={handleForward}
        message={contextMenu?.message}
        mouseX={contextMenu?.mouseX}
        mouseY={contextMenu?.mouseY}
        hideReplyForward={contextMenu?.message?.type === 'template' || contextMenu?.message?.MessageType === 'template'}
      />

      {forwardMessage && (
        <ForwardMessageModal
          message={forwardMessage}
          onSend={handleSendForward}
          onClose={() => setForwardMessage(null)}
        />
      )}

      <RedirectionModal
        isOpen={redirectModal.open}
        url={redirectModal.url}
        onClose={() => setRedirectModal({ open: false, url: '' })}
        onConfirm={() => {
          window.open(redirectModal.url, '_blank', 'noopener,noreferrer');
          setRedirectModal({ open: false, url: '' });
        }}
      />
    </div>
  );
}
