'use client';

import { useEffect, useState } from 'react';
import { Box, Typography, LinearProgress } from '@mui/material';
import { MessageCircle } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import { fetchChannels, fetchConversationLists } from '../../api/chat/conversationApi';
import { fetchPreloadChat } from '../../api/chat/preloadApi';
import { processApiResponse, extractTopTemplates, extractMediaInfo } from './utils/chatUtils';
import { fetchTemplatesByName } from '../../api/TemplateApi';
import { setCachedMediaUrls } from '../../utils/mediaCacheService';
import { getToken } from '../../utils/storage';

export default function ChatPreloader({ onComplete }) {
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('conversations'); // conversations | messages | templates | done
  const [fading, setFading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    let mounted = true;
    const simulatePreload = async () => {
      const auth = useAuthStore.getState().auth;
      const userId = auth?.userId || auth?.userid || auth?.appuserid || '';

      setStage('conversations');
      setStatusMsg('Loading chat…');

      const apiPromise = (async () => {
        if (!userId) return;
        try {
          if (mounted) setStatusMsg('Loading channels…');

          // 1. Fetch channels to find the default one
          const channelsResp = await fetchChannels(userId);
          const channels = channelsResp?.data || [];
          if (!mounted) return;

          // Store ALL channels in the chat store so ChatChannelPanel can use them instantly
          if (channels.length) {
            const store = useChatStore.getState();
            store.setChannels(channels);
            store.setChannelsLoaded(true);
          }

          // 2. Find default channel (IsDefault === 1), fall back to first active
          const defaultChannel =
            channels.find((c) => Number(c.IsDefault) === 1) ||
            channels.find((c) => c.IsActive !== 0) ||
            channels[0] ||
            null;

          if (defaultChannel) {
            const store = useChatStore.getState();
            store.setDefaultChannelId(defaultChannel.Id || null);
            // Set as selected channel so fetchConversationLists sends the right AccountId
            store.setSelectedChannelId(defaultChannel.Id || null);
            store.setSelectedChannel(defaultChannel);
          }

          // 3. Fetch conversations AND preload messages in parallel (channel is now set in store)
          if (mounted) setStatusMsg('Loading chats…');
          const [convResp, preloadResp] = await Promise.all([
            fetchConversationLists(1, 20, userId, ''),
            fetchPreloadChat(userId, 1, 20, defaultChannel?.Id || ''),
          ]);

          // 4. Store conversations in the store
          if (mounted) {
            const rawList = convResp?.data?.rd || [];
            const rd1List = convResp?.data?.rd1 || [];
            const conversations = rawList.length > 0 ? rawList : rd1List;
            if (conversations.length) {
              const processed = processApiResponse(conversations);
              const store = useChatStore.getState();
              store.setConversations(processed);
              store.setAllConversationsCache(processed);
              // Also cache per-channel so ChatSidebar uses cache instead of re-fetching
              if (defaultChannel?.Id) {
                store.setConversationsByChannel(defaultChannel.Id, processed);
              }
            }
          }

          if (mounted) { setStage('messages'); setStatusMsg('Loading messages…'); }

          // 5. Store ALL messages from preload data into the store
          const preloadData = preloadResp?.data || [];
          if (preloadData.length && mounted) {
            const store = useChatStore.getState();
            preloadData.forEach((conv) => {
              const convId = String(conv.ConversationId ?? conv.Id ?? conv.CustomerId);
              const msgs = conv.ChatMessages;
              if (convId && Array.isArray(msgs) && msgs.length) {
                store.setMessages(convId, msgs);
              }
            });
          }

          // 6. Extract ALL templates & ALL media info from preload data
          if (preloadData.length && mounted) {
            const allTemplateNames = extractTopTemplates(preloadData, 0);
            const { fileUrlCache, imageUrls } = extractMediaInfo(preloadData, 0);
            const creds = getToken() || {};
            const wabaid = defaultChannel?.WabaId || creds?.wabaid || '';

            // Preload ALL images into browser cache so skeleton doesn't show
            if (imageUrls.length > 0) {
              imageUrls.forEach((url) => {
                const img = new Image();
                img.src = url;
              });
            }

            if (mounted) { setStage('templates'); setStatusMsg('Finishing up…'); }

            await Promise.all([
              // Fetch ALL templates
              (async () => {
                try {
                  if (allTemplateNames.length > 0) {
                    const fetchedTemplates = await fetchTemplatesByName(allTemplateNames, { wabaid });
                    if (mounted) {
                      const store = useChatStore.getState();
                      store.setTemplates(fetchedTemplates);
                      store.setTemplatesLoaded(true);
                    }
                  } else if (mounted) {
                    useChatStore.getState().setTemplatesLoaded(true);
                  }
                } catch (e) {
                  console.error('Template fetch error:', e);
                  if (mounted) useChatStore.getState().setTemplatesLoaded(true);
                }
              })(),
              // Cache ALL media
              (async () => {
                if (Object.keys(fileUrlCache).length > 0) {
                  setCachedMediaUrls(fileUrlCache);
                }
              })(),
            ]);
          } else {
            // No preload data — still mark templates as loaded
            useChatStore.getState().setTemplatesLoaded(true);
          }
        } catch (err) {
          console.error('Preload setup error:', err);
        } finally {
          if (mounted && !useChatStore.getState().templatesLoaded) {
            useChatStore.getState().setTemplatesLoaded(true);
          }
        }
      })();

      // Run progress animation concurrently (minimum ~1.5s flash screen)
      const animPromise = (async () => {
        for (let i = 0; i <= 40; i += 2) {
          if (!mounted) return;
          setProgress(i);
          await delay(40);
        }
        for (let i = 40; i <= 75; i += 1) {
          if (!mounted) return;
          setProgress(i);
          await delay(30);
        }
        for (let i = 75; i <= 95; i += 2) {
          if (!mounted) return;
          setProgress(i);
          await delay(25);
        }
      })();

      // Wait for both API and animation to finish
      await Promise.all([apiPromise, animPromise]);

      // Finalize progress bar
      for (let i = 95; i <= 100; i += 1) {
        if (!mounted) return;
        setProgress(i);
        await delay(20);
      }

      if (mounted) {
        setStage('done');
        setStatusMsg('Ready to chat!');
        setFading(true);
        setTimeout(() => {
          if (mounted) onComplete?.();
        }, 400);
      }
    };

    simulatePreload();

    return () => {
      mounted = false;
    };
  }, [onComplete]);

  const stageText = {
    conversations: 'Loading chats…',
    messages: 'Loading messages…',
    templates: 'Finishing up…',
    done: 'Almost there…',
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'var(--bg-default)',
        zIndex: 9999,
        gap: 3,
        opacity: fading ? 0 : 1,
        transition: 'opacity 0.35s ease-out',
        pointerEvents: fading ? 'none' : 'auto',
        '@keyframes chatFadeIn': {
          from: { opacity: 0, transform: 'translateY(4px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        '@keyframes pulseScale': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.08)' },
        },
      }}
    >
      {/* WhatsApp-style chat bubble icon */}
      <Box
        sx={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--primary-main) 0%, var(--wa-header) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 12px 40px color-mix(in srgb, var(--primary-main) 30%, transparent)',
          animation: 'pulseScale 2s ease-in-out infinite',
        }}
      >
        <MessageCircle size={34} color="var(--button-color)" strokeWidth={2.5} />
      </Box>

      <Typography
        sx={{
          fontWeight: 700,
          color: 'var(--text-primary)',
          fontFamily: 'Poppins, sans-serif',
          fontSize: '1.15rem',
          letterSpacing: '-0.3px',
        }}
      >
        WABA Chat
      </Typography>

      {/* Progress bar with percentage */}
      <Box sx={{ width: 280, mt: 1, position: 'relative' }}>
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{
            height: 6,
            borderRadius: 3,
            bgcolor: 'var(--bg-light)',
            '& .MuiLinearProgress-bar': {
              bgcolor: 'var(--primary-main)',
              borderRadius: 3,
              transition: 'transform 0.3s ease-out',
            },
          }}
        />
        <Typography
          sx={{
            position: 'absolute',
            right: 0,
            top: -20,
            fontSize: '0.7rem',
            color: 'var(--primary-main)',
            fontWeight: 600,
            fontFamily: 'Poppins, sans-serif',
          }}
        >
          {Math.round(progress)}%
        </Typography>
      </Box>

      {/* Simple status text */}
      <Typography
        key={statusMsg}
        sx={{
          color: 'var(--text-secondary)',
          fontFamily: 'Poppins, sans-serif',
          fontSize: '0.95rem',
          mt: 0.5,
          minHeight: '1.2em',
          animation: 'chatFadeIn 0.3s ease-out',
        }}
      >
        {statusMsg || stageText[stage]}
      </Typography>
    </Box>
  );
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
