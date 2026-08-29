'use client';

import { useEffect, useRef, useState, createContext, useContext } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  initializeSocket,
  disconnectSocket,
  isSocketConnected,
  addSessionLogoutHandler,
  addMessageHandler,
  addMessageHandlerFromAssigningUser,
  addMessageReactionHandler,
  broadcastLogout,
} from '../socket';
import { useAuth } from '../hooks/useAuth';
import { getUserData, storage } from '../utils/storage';
import { savePlayerId } from '../api/chat/conversationApi';
import { notify } from '../utils/notifications';
import { unlockNotificationAudio } from '../utils/notificationSound';

const SocketStatusContext = createContext({ isConnected: false, socketStatus: 'disconnected' });

export function useSocketStatus() {
  return useContext(SocketStatusContext);
}

export default function SocketProvider({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { auth } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [socketStatus, setSocketStatus] = useState('disconnected');
  const intervalRef = useRef(null);

  const isPublicRoute =
    pathname === '/login' || pathname === '/session-check' || pathname === '/test';

  useEffect(() => {
    if (isPublicRoute) return;

    let mounted = true;

    const start = async () => {
      let token = auth?.token;
      let userId = auth?.userId || auth?.userid || auth?.appuserid;

      if (!token || !userId) {
        const userData = getUserData();
        if (userData) {
          token = userData.token;
          userId = userData.userId || userData.userid || userData.appuserid;
        }
      }

      if (!token || !userId) return;

      const socket = initializeSocket(token);
      if (!socket) return;

      socket.on('connect', async () => {
        if (!mounted) return;
        setIsConnected(true);
        setSocketStatus('connected');

        // Register socket ID with backend
        try {
          const userData = getUserData();
          const socketId = socket?.id;
          const uid = auth?.userId || userData?.userId;
          const id = auth?.id || userData?.id;
          if (socketId && uid && id) {
            const socketKey = pathname === '/chat' ? 'ChatSocketId' : 'SocketId';
            const result = await savePlayerId(socketId, uid, id, socketKey);
            if (result) {
              console.log('Socket ID registered successfully:', result);
            } else {
              console.warn('Socket ID registration returned empty response');
            }
          }
        } catch (err) {
          console.error('Failed to register socket ID:', err);
        }
      });

      socket.on('disconnect', (reason) => {
        if (!mounted) return;
        setIsConnected(false);
        setSocketStatus('disconnected');
      });

      socket.on('connect_error', () => {
        if (!mounted) return;
        setIsConnected(false);
        setSocketStatus('error');
      });

      intervalRef.current = setInterval(() => {
        if (!mounted) return;
        const connected = isSocketConnected();
        setIsConnected(connected);
        setSocketStatus(connected ? 'connected' : 'disconnected');
      }, 5000);
    };

    start();

    return () => {
      mounted = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [auth?.token, isPublicRoute]);

  useEffect(() => {
    if (isPublicRoute) return;
    const removeHandler = addSessionLogoutHandler(() => {
      disconnectSocket(true);
      storage.clear();
      sessionStorage.removeItem('waba_preload_done');
      broadcastLogout();
      window.location.replace(`${window.location.origin}/`);
      toast.error('Your session has been logged out from another device', {
        duration: 3000,
      });
    });

    return () => removeHandler();
  }, [isPublicRoute, router]);

  // Listen for logout broadcasts from OTHER tabs
  useEffect(() => {
    if (isPublicRoute) return;
    let bc = null;
    let bcHandler = null;

    try {
      bc = new BroadcastChannel('waba-session-logout');
      bcHandler = (event) => {
        if (event.data === 'logout') {
          disconnectSocket(true);
          storage.clear();
          sessionStorage.removeItem('waba_preload_done');
          window.location.replace(`${window.location.origin}/`);
        }
      };
      bc.addEventListener('message', bcHandler);
    } catch (_) {
      // Fallback to localStorage
    }

    const storageHandler = (e) => {
      if (e.key === 'waba-logout') {
        disconnectSocket(true);
        storage.clear();
        sessionStorage.removeItem('waba_preload_done');
        window.location.replace(`${window.location.origin}/`);
      }
    };
    window.addEventListener('storage', storageHandler);

    return () => {
      if (bc && bcHandler) bc.removeEventListener('message', bcHandler);
      if (bc) bc.close();
      window.removeEventListener('storage', storageHandler);
    };
  }, [isPublicRoute]);

  // Unlock notification audio on first user interaction (browser autoplay policy)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const unlock = () => {
      unlockNotificationAudio();
      document.removeEventListener('click', unlock);
      document.removeEventListener('keydown', unlock);
    };
    document.addEventListener('click', unlock, { once: true, capture: true });
    document.addEventListener('keydown', unlock, { once: true, capture: true });
    return () => {
      document.removeEventListener('click', unlock, { capture: true });
      document.removeEventListener('keydown', unlock, { capture: true });
    };
  }, []);

  // Browser notifications for incoming chat events
  useEffect(() => {
    if (isPublicRoute) return;

    // Deduplicate notifications within 2 seconds by message ID (per-tab)
    const recentNotifications = new Map();
    // Cross-tab deduplication via BroadcastChannel
    const claimedByOtherTab = new Map();
    let bc = null;
    try {
      bc = new BroadcastChannel('waba-notify');
      bc.onmessage = (ev) => {
        if (ev.data?.action === 'claim' && ev.data?.msgId) {
          claimedByOtherTab.set(ev.data.msgId, Date.now());
        }
      };
    } catch (_) { /* BroadcastChannel not supported */ }

    const cleanClaims = () => {
      const now = Date.now();
      for (const [key, ts] of claimedByOtherTab) {
        if (now - ts > 3000) claimedByOtherTab.delete(key);
      }
    };

    const handleNotify = (data, type) => {
      const msgId = data?.Id ?? data?.id ?? data?.autoid ?? data?.MessageId;
      if (msgId) {
        const key = `${type}-${msgId}`;
        // Per-tab dedup
        const last = recentNotifications.get(key);
        if (last && Date.now() - last < 2000) return;
        // Cross-tab dedup: another tab already claimed this message
        cleanClaims();
        if (claimedByOtherTab.has(key)) return;
        // Claim it for other tabs
        recentNotifications.set(key, Date.now());
        try { bc?.postMessage({ action: 'claim', msgId: key }); } catch (_) {}
      }
      notify(data, type);
    };

    const removeNewMsg = addMessageHandler((data) => {
      handleNotify(data, 'NEW_MESSAGE');
    });

    const removeAssignMsg = addMessageHandlerFromAssigningUser((data) => {
      handleNotify(data, 'NEW_MESSAGE');
    });

    const removeReaction = addMessageReactionHandler((data) => {
      handleNotify(data, 'MESSAGE_REACTION');
    });

    return () => {
      removeNewMsg();
      removeAssignMsg();
      removeReaction();
      try { bc?.close(); } catch (_) {}
    };
  }, [isPublicRoute]);

  return (
    <SocketStatusContext.Provider value={{ isConnected, socketStatus }}>
      {children}
    </SocketStatusContext.Provider>
  );
}
