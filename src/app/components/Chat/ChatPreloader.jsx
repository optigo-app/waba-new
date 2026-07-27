'use client';

import { useEffect, useState } from 'react';
import { Box, Typography, LinearProgress } from '@mui/material';
import { MessageCircle } from 'lucide-react';
import { fetchPreloadChat } from '../../api/chat/preloadApi';
import { fetchConversationLists } from '../../api/chat/conversationApi';
import { processApiResponse, extractTopTemplates, extractMediaInfo } from './utils/chatUtils';
import { fetchTemplatesByName } from '../../api/TemplateApi';
import { setCachedMediaUrls } from '../../utils/mediaCacheService';
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
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
      setStatusMsg('Fetching conversations…');

      const apiPromise = (async () => {
        if (!userId) return;
        try {
          // 1. Fetch conversations AND messages in parallel
          const [convResp, preloadResp] = await Promise.all([
            fetchConversationLists(1, 100, userId, ''),
            fetchPreloadChat(userId, 1, 100),
          ]);

          if (mounted) setStatusMsg(`Loaded ${convResp?.data?.rd?.length || convResp?.data?.rd1?.length || 0} conversations`);

          // 2. Store conversations
          if (mounted) {
            const rawList = convResp?.data?.rd || [];
            const rd1List = convResp?.data?.rd1 || [];
            const conversations = rawList.length > 0 ? rawList : rd1List;
            if (conversations.length) {
              const processed = processApiResponse(conversations);
              const store = useChatStore.getState();
              store.setConversations(processed);
              store.setAllConversationsCache(processed);
            }
          }

          if (mounted) { setStage('messages'); setStatusMsg('Loading messages…'); }

          // 3. Store ALL messages from API (no limit)
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

          // 4. Extract ALL templates & ALL media info from all conversations
          if (preloadData.length && mounted) {
            const allTemplateNames = extractTopTemplates(preloadData, 0);
            const { fileUrlCache, imageUrls } = extractMediaInfo(preloadData, 0);
            const creds = getToken() || {};

            // Preload ALL images into browser cache so skeleton doesn't show
            if (imageUrls.length > 0) {
              imageUrls.forEach((url) => {
                const img = new Image();
                img.src = url;
              });
            }

            if (mounted) { setStage('templates'); setStatusMsg(`Fetching ${allTemplateNames.length} templates & caching ${Object.keys(fileUrlCache).length} media…`); }

            await Promise.all([
              // Fetch ALL templates
              (async () => {
                try {
                  if (allTemplateNames.length > 0) {
                    const fetchedTemplates = await fetchTemplatesByName(allTemplateNames, creds);
                    if (mounted) {
                      const store = useChatStore.getState();
                      store.setTemplates(fetchedTemplates);
                      store.setTemplatesLoaded(true);
                      if (mounted) setStatusMsg(`Loaded ${fetchedTemplates.length} templates`);
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
                  if (mounted) setStatusMsg(`Cached ${Object.keys(fileUrlCache).length} media files`);
                }
              })(),
            ]);
          } else {
            // No preload data — still mark templates as loaded so DynamicTemplate doesn't wait
            useChatStore.getState().setTemplatesLoaded(true);
          }
        } catch (err) {
          console.error('Preload API error:', err);
        } finally {
          // Always mark templates as loaded so DynamicTemplate doesn't wait forever
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
    conversations: 'Loading conversations…',
    messages: 'Loading messages…',
    templates: 'Loading templates & media…',
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
        bgcolor: '#f0f2f5',
        zIndex: 9999,
        gap: 2,
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
        '@keyframes shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      }}
    >
      {/* WhatsApp-style chat bubble icon */}
      <Box
        sx={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #25d366 0%, #128c7e 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 12px 40px rgba(37, 211, 102, 0.3)',
          animation: 'pulseScale 2s ease-in-out infinite',
        }}
      >
        <MessageCircle size={40} color="#fff" strokeWidth={2.5} />
      </Box>

      <Typography
        variant="h6"
        sx={{
          fontWeight: 700,
          color: '#444050',
          fontFamily: 'Poppins, sans-serif',
          fontSize: '1.25rem',
          mt: 1,
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
            bgcolor: 'rgba(0,0,0,0.08)',
            '& .MuiLinearProgress-bar': {
              bgcolor: '#25d366',
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
            color: '#25d366',
            fontWeight: 600,
            fontFamily: 'Poppins, sans-serif',
          }}
        >
          {Math.round(progress)}%
        </Typography>
      </Box>

      {/* Dynamic status message */}
      <Typography
        key={statusMsg}
        variant="body2"
        sx={{
          color: '#667781',
          fontFamily: 'Poppins, sans-serif',
          fontSize: '0.8rem',
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
