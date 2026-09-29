'use client';

import { io } from 'socket.io-client';
import { getSocketState, setSocketState, removeSocketState } from './utils/storage';
import { getSocketURL } from './api/Config';
import { useChatStore } from './store/chatStore';
import { processIncomingMedia } from './utils/processIncomingMedia';

let socketInstance = null;
let socketToken = null;
let isAuthenticated = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

const dispatch = (type, detail) => {
    if (typeof window === 'undefined') return;
    try {
        window.dispatchEvent(new CustomEvent(type, { detail }));
    } catch { /* ignore */ }
};

const on = (type, handler) => {
    if (typeof window === 'undefined') return () => {};
    const wrapped = (e) => handler(e.detail);
    window.addEventListener(type, wrapped);
    return () => window.removeEventListener(type, wrapped);
};

const TAB_ID = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const seenEmitKeys = new Map();
let tabSync = null;

const getTabSync = () => {
    if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return null;
    if (!tabSync) {
        tabSync = new BroadcastChannel('waba-socket-sync');
        tabSync.onmessage = (e) => {
            const { tabId, event, data } = e.data || {};
            if (!tabId || tabId === TAB_ID || !event) return;
            handleSocketEvent(event, data, false);
        };
    }
    return tabSync;
};

const isDuplicateEmit = (event, data) => {
    // Prefer MessageId (wamid — globally unique per message); some emits carry
    // an Id that isn't the message row id, so also scope by conversation + timestamp
    const id = data?.MessageId ?? data?.Id ?? data?.id ?? data?.autoid;
    if (id === undefined || id === null || id === '') return false;
    // newMessage/sendMessage can carry the same payload — treat as one event
    const dedupeEvent = event === 'newMessage' || event === 'sendMessage' ? 'message' : event;
    const variant = data?.Status ?? data?.status ?? data?.emoji ?? data?.Emoji ?? '';
    const reactions = data?.ReactionEmojis ?? data?.reactionEmojis ?? '';
    const convId = data?.ConversationId ?? data?.conversationId ?? data?.customerId ?? '';
    const ts = data?.DateTime ?? data?.dateTime ?? '';
    const key = `${dedupeEvent}:${convId}:${id}:${variant}:${reactions}:${ts}`;
    const now = Date.now();
    for (const [k, ts] of seenEmitKeys) if (now - ts > 5000) seenEmitKeys.delete(k);
    if (seenEmitKeys.has(key)) return true;
    seenEmitKeys.set(key, now);
    return false;
};

const handleSocketEvent = (event, data, rebroadcast = true) => {
    if (isDuplicateEmit(event, data)) return;
    switch (event) {
        case 'newMessage':
        case 'sendMessage':
            handleIncomingMessage(data, event);
            break;
        case 'sendReaction':
            try { useChatStore.getState().handleSocketReaction(data); } catch { /* ignore */ }
            dispatch('waba:sendReaction', data);
            break;
        case 'changeStatus':
            try { useChatStore.getState().handleSocketStatusChange(data); } catch { /* ignore */ }
            dispatch('waba:changeStatus', data);
            break;
        case 'sessionLogout':
            dispatch('waba:sessionLogout', data);
            break;
        default:
            dispatch(`waba:${event}`, data);
    }
    if (rebroadcast) getTabSync()?.postMessage({ tabId: TAB_ID, event, data });
};

const handleIncomingMessage = (data, eventName) => {
    console.log('handleIncomingMessage--->>>', data, eventName)
    try {
        useChatStore.getState().handleSocketMessage(data);
    } catch (e) {
        console.error(`[socket] ${eventName} store error:`, e);
    }
    if (String(data?.CampaignId) !== '1') {
        dispatch(`waba:${eventName}`, data);
    }
    processIncomingMedia(data)
        .then((result) => {
            if (!result?.serverUrl || !result?.conversationId) return;
            const msgId = String(data?.Id ?? data?.id ?? data?.autoid ?? data?.MessageId ?? '');
            if (!msgId) return;
            useChatStore.getState().updateMessage(result.conversationId, msgId, {
                FileUrl: result.serverUrl,
                fileUrl: result.serverUrl,
                MediaUrl: result.serverUrl,
                mediaUrl: result.serverUrl,
            });
        })
        .catch((err) => console.error('[socket] incoming media error:', err));
};

export const initializeSocket = (token) => {
    const prevToken = getSocketState()?.token;
    if (token) setSocketState({ token });
    const nextToken = token || prevToken || null;

    if (socketInstance?.active && socketToken === nextToken) return socketInstance;

    if (socketInstance) {
        socketInstance.disconnect();
        socketInstance = null;
        isAuthenticated = false;
    }
    socketToken = nextToken;

    const socketURL = getSocketURL();
    if (!socketURL) {
        console.error('[socket] socket URL is empty — check NEXT_PUBLIC_SOCKET_* env vars');
        return null;
    }
    if (
        typeof window !== 'undefined' &&
        window.location.protocol === 'https:' &&
        /^http:\/\//i.test(socketURL)
    ) {
        console.warn('[socket] HTTPS page cannot open ws:// — mixed content will be blocked. Use an https:// socket URL.');
    }

    socketInstance = io(socketURL, {
        auth: { token },
        reconnection: true,
    });

    const manager = socketInstance.io;
    manager.on('reconnect_error', (err) => console.warn('[socket] reconnect error:', err?.message || err));
    manager.on('reconnect_failed', () => console.error('[socket] reconnect failed — all attempts exhausted'));

    socketInstance.onAny((event, data) => {
        const preview = {
            conversationId: data?.ConversationId ?? data?.conversationId ?? data?.customerId ?? data?.autoid,
            channelId: data?.ChannelId ?? data?.AccountId ?? data?.channelId ?? data?.accountId,
            direction: data?.Direction ?? data?.direction,
            type: data?.MessageType ?? data?.type,
            id: data?.Id ?? data?.id ?? data?.autoid ?? data?.MessageId,
            ...data
        };
        console.log(`[socket] ${new Date().toISOString().slice(11, 23)} recv "${event}"`, preview);
    });

    socketInstance.on('connect', () => {
        isAuthenticated = true;
        reconnectAttempts = 0;
    });

    socketInstance.on('disconnect', (reason) => {
        isAuthenticated = false;
        if (reason !== 'io client disconnect') {
            console.warn('[socket] disconnected:', reason);
        }
    });

    socketInstance.on('connect_error', (err) => {
        isAuthenticated = false;
        console.error('[socket] connect_error:', err?.message, err?.data ?? err?.context ?? '');
    });

    socketInstance.on('newMessage', (data) => handleSocketEvent('newMessage', data));
    socketInstance.on('sendMessage', (data) => handleSocketEvent('sendMessage', data));
    socketInstance.on('sendReaction', (data) => handleSocketEvent('sendReaction', data));
    socketInstance.on('changeStatus', (data) => handleSocketEvent('changeStatus', data));
    socketInstance.on('sessionLogout', (data) => handleSocketEvent('sessionLogout', data));

    return socketInstance;
};

export const getSocket = () => socketInstance;

export const isSocketConnected = () => {
    const state = Boolean(socketInstance?.connected && isAuthenticated);

    if (!state && !socketInstance && typeof window !== 'undefined') {
        const savedState = getSocketState();
        if (savedState) {
            try {
                const { token } = savedState;
                if (token && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                    reconnectAttempts++;
                    initializeSocket(token);
                }
            } catch (e) {
                console.error('[socket] reconnection attempt failed:', e);
            }
        }
    }

    return state;
};

export const isSocketAuthenticated = () => isAuthenticated;

export const addMessageHandler = (handler) => on('waba:newMessage', handler);

export const addSessionLogoutHandler = (handler) => on('waba:sessionLogout', handler);

export const addMessageHandlerFromAssigningUser = (handler) => on('waba:sendMessage', handler);

export const addMessageReactionHandler = (handler) =>
    typeof handler === 'function' ? on('waba:sendReaction', handler) : () => {};

export const addStatusHandler = (handler) => on('waba:changeStatus', handler);

export const emitReaction = (data) => {
    if (socketInstance && isAuthenticated) {
        socketInstance.emit('sendReaction', data);
    }
};

const BROADCAST_CHANNEL = 'waba-session-logout';

export const broadcastLogout = () => {
    try {
        const bc = new BroadcastChannel(BROADCAST_CHANNEL);
        bc.postMessage('logout');
        bc.close();
    } catch {
        try {
            localStorage.setItem('waba-logout', Date.now().toString());
        } catch { /* ignore */ }
    }
};

export const disconnectSocket = (permanent = false) => {
    if (socketInstance) {
        socketInstance.disconnect();
        socketInstance = null;
    }
    socketToken = null;
    isAuthenticated = false;
    if (permanent) {
        removeSocketState();
    }
};
